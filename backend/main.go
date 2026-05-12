package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"golang.org/x/crypto/bcrypt"

	"gatus-config-editor/internal/backup"
	"gatus-config-editor/internal/config"
	"gatus-config-editor/internal/discovery"
	"gatus-config-editor/internal/docker"
	"gatus-config-editor/internal/ratelimit"
	"gatus-config-editor/internal/session"
	"gatus-config-editor/internal/validator"
	"gatus-config-editor/internal/yamlutil"
)

// ── helpers ───────────────────────────────────────────────────────────────────

func jsonOK(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func jsonErr(w http.ResponseWriter, status int, detail any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"detail": detail})
}

func decodeJSON(r *http.Request, dst any) error {
	return json.NewDecoder(r.Body).Decode(dst)
}

// ── server ────────────────────────────────────────────────────────────────────

type Server struct {
	cfg      *config.Config
	sessions *session.Manager
	rl       *ratelimit.Limiter
	pwdHash  []byte // bcrypt hash of cfg.AdminPassword
}

func NewServer(cfg *config.Config) (*Server, error) {
	if err := cfg.ValidateSecurity(); err != nil {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.AdminPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("bcrypt: %w", err)
	}
	return &Server{
		cfg:      cfg,
		sessions: session.NewManager(cfg.SessionSecret, cfg.HTTPSOnly),
		rl:       ratelimit.New(),
		pwdHash:  hash,
	}, nil
}

func (s *Server) Routes() http.Handler {
	r := chi.NewRouter()

	// Do not use middleware.RealIP here: login rate limiting intentionally
	// keys off the direct peer address, not client-controlled forwarding headers.
	r.Use(middleware.Recoverer)
	r.Use(securityHeaders)

	if s.cfg.CORSOriginsRaw != "" {
		origins := splitTrim(s.cfg.CORSOriginsRaw, ",")
		r.Use(corsMiddleware(origins))
	}

	// API routes
	r.Route("/api", func(r chi.Router) {
		r.Get("/health", s.handleHealth)

		// Auth — no CSRF on login (bootstrap)
		r.Post("/auth/login", s.handleLogin)
		r.Post("/auth/logout", s.handleLogout)
		r.Get("/auth/me", s.requireAuth(s.handleMe))
		r.Get("/auth/csrf", s.requireAuth(s.handleGetCSRF))

		// Config — CSRF protected mutations
		r.Get("/config/files", s.requireAuth(s.handleListFiles))
		r.Get("/config/file", s.requireAuth(s.handleGetFile))
		r.Post("/config/file", s.requireAuth(s.csrfProtect(s.handleWriteFile)))
		r.Post("/config/validate", s.requireAuth(s.handleValidate))
		r.Post("/config/save", s.requireAuth(s.csrfProtect(s.handleSaveConfig)))
		r.Get("/config/backups", s.requireAuth(s.handleListBackups))
		r.Get("/config/backups/{id}", s.requireAuth(s.handleGetBackup))
		r.Get("/config/backups/{id}/download", s.requireAuth(s.handleDownloadBackup))
		r.Post("/config/rollback", s.requireAuth(s.csrfProtect(s.handleRollback)))
		r.Post("/config/diff", s.requireAuth(s.handleDiff))

		// Gatus / Docker
		r.Get("/gatus/status", s.requireAuth(s.handleGatusStatus))
		r.Post("/gatus/restart", s.requireAuth(s.csrfProtect(s.handleGatusRestart)))
		r.Get("/gatus/logs", s.requireAuth(s.handleGatusLogs))
		r.Get("/gatus/endpoints", s.requireAuth(s.handleGatusEndpoints))
	})

	// Frontend SPA — catch-all, registered after API routes
	r.Get("/*", s.handleFrontend)
	r.Get("/", s.handleFrontend)

	return r
}

// ── middleware ────────────────────────────────────────────────────────────────

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

func corsMiddleware(origins []string) func(http.Handler) http.Handler {
	set := map[string]bool{}
	for _, o := range origins {
		set[o] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if set[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (s *Server) requireAuth(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sess := s.sessions.Get(r)
		if sess.User == "" {
			jsonErr(w, http.StatusUnauthorized, "Not authenticated")
			return
		}
		h(w, r)
	}
}

func (s *Server) csrfProtect(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.cfg.CSRFEnabled {
			h(w, r)
			return
		}
		sess := s.sessions.Get(r)
		requestToken := r.Header.Get("X-CSRF-Token")
		if sess.CSRFToken == "" || requestToken == "" || requestToken != sess.CSRFToken {
			jsonErr(w, http.StatusForbidden, "CSRF token invalid or missing")
			return
		}
		h(w, r)
	}
}

// ── handlers ──────────────────────────────────────────────────────────────────

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, map[string]string{"status": "ok"})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	// Rate limit
	if msg := s.rl.Check(r); msg != "" {
		jsonErr(w, http.StatusTooManyRequests, msg)
		return
	}

	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &req); err != nil {
		jsonErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if req.Username != s.cfg.AdminUsername ||
		bcrypt.CompareHashAndPassword(s.pwdHash, []byte(req.Password)) != nil {
		s.rl.RecordFailure(r)
		jsonErr(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	s.rl.RecordSuccess(r)

	csrfToken := generateToken()
	sess := &session.Data{User: req.Username, CSRFToken: csrfToken}
	if err := s.sessions.Save(w, sess); err != nil {
		jsonErr(w, http.StatusInternalServerError, "session error")
		return
	}

	jsonOK(w, map[string]string{
		"username":   req.Username,
		"message":    "Login successful",
		"csrf_token": csrfToken,
	})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	s.sessions.Clear(w)
	jsonOK(w, map[string]string{"message": "Logged out"})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	sess := s.sessions.Get(r)
	jsonOK(w, map[string]string{"username": sess.User, "csrf_token": sess.CSRFToken})
}

func (s *Server) handleGetCSRF(w http.ResponseWriter, r *http.Request) {
	sess := s.sessions.Get(r)
	if sess.CSRFToken == "" {
		sess.CSRFToken = generateToken()
		_ = s.sessions.Save(w, sess)
	}
	jsonOK(w, map[string]string{"csrf_token": sess.CSRFToken})
}

// Config handlers

func (s *Server) handleListFiles(w http.ResponseWriter, r *http.Request) {
	files, err := discovery.ListFiles(s.cfg.GatusConfigPath)
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	type fileSummary struct {
		Name         string  `json:"name"`
		Path         string  `json:"path"`
		SizeBytes    int64   `json:"size_bytes"`
		LastModified float64 `json:"last_modified"`
	}
	var result []fileSummary
	for _, f := range files {
		info, err := os.Stat(f)
		if err != nil {
			continue
		}
		result = append(result, fileSummary{
			Name:         filepath.Base(f),
			Path:         f,
			SizeBytes:    info.Size(),
			LastModified: float64(info.ModTime().UnixMilli()) / 1000,
		})
	}
	if result == nil {
		result = []fileSummary{}
	}
	jsonOK(w, result)
}

func (s *Server) handleGetFile(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	path, err := discovery.ResolvePath(s.cfg.GatusConfigPath, name)
	if err != nil {
		jsonErr(w, http.StatusBadRequest, err.Error())
		return
	}
	content, err := yamlutil.ReadRaw(path)
	if err != nil {
		if os.IsNotExist(err) {
			jsonErr(w, http.StatusNotFound, fmt.Sprintf("file not found: %s", name))
		} else {
			jsonErr(w, http.StatusInternalServerError, err.Error())
		}
		return
	}
	jsonOK(w, map[string]string{"name": filepath.Base(path), "path": path, "content": content})
}

func (s *Server) handleWriteFile(w http.ResponseWriter, r *http.Request) {
	if s.cfg.ReadOnlyMode {
		jsonErr(w, http.StatusForbidden, "Read-only mode is enabled")
		return
	}
	var req struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}
	if err := decodeJSON(r, &req); err != nil {
		jsonErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	path, err := discovery.ResolvePath(s.cfg.GatusConfigPath, req.Name)
	if err != nil {
		jsonErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := yamlutil.WriteRaw(path, req.Content); err != nil {
		jsonErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	jsonOK(w, map[string]string{"name": filepath.Base(path), "path": path, "content": req.Content})
}

func (s *Server) handleValidate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Content string `json:"content"`
	}
	if err := decodeJSON(r, &req); err != nil {
		jsonErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	result := validator.Validate(req.Content)
	jsonOK(w, result)
}

func (s *Server) handleSaveConfig(w http.ResponseWriter, r *http.Request) {
	if s.cfg.ReadOnlyMode {
		jsonErr(w, http.StatusForbidden, "Read-only mode is enabled")
		return
	}
	var req struct {
		Name    string `json:"name"`
		Content string `json:"content"`
		Force   bool   `json:"force"`
	}
	if err := decodeJSON(r, &req); err != nil {
		jsonErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	path, err := discovery.ResolvePath(s.cfg.GatusConfigPath, req.Name)
	if err != nil {
		jsonErr(w, http.StatusBadRequest, err.Error())
		return
	}

	if !req.Force {
		result := validator.Validate(req.Content)
		if !result.Valid {
			jsonErr(w, http.StatusUnprocessableEntity, map[string]any{
				"message": "Config validation failed. Use force=true to save anyway.",
				"errors":  result.Errors,
			})
			return
		}
	}

	// Backup current file before overwriting
	if existing, err := yamlutil.ReadRaw(path); err == nil {
		sess := s.sessions.Get(r)
		if _, err := backup.Create(s.cfg.BackupDir, path, existing, sess.User); err != nil {
			jsonErr(w, http.StatusInternalServerError, fmt.Sprintf("failed to create backup: %v", err))
			return
		}
	}

	if err := yamlutil.WriteRaw(path, req.Content); err != nil {
		jsonErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	jsonOK(w, map[string]string{"name": filepath.Base(path), "path": path, "content": req.Content})
}

// Backup handlers

func (s *Server) handleListBackups(w http.ResponseWriter, r *http.Request) {
	file := r.URL.Query().Get("file")
	metas, err := backup.List(s.cfg.BackupDir, file)
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	if metas == nil {
		metas = []backup.Meta{}
	}
	jsonOK(w, metas)
}

func (s *Server) handleGetBackup(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	content, meta, err := backup.GetContent(s.cfg.BackupDir, id)
	if err != nil {
		jsonErr(w, http.StatusNotFound, err.Error())
		return
	}
	jsonOK(w, map[string]any{"id": id, "content": content, "meta": meta})
}

func (s *Server) handleDownloadBackup(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	content, meta, err := backup.GetContent(s.cfg.BackupDir, id)
	if err != nil {
		jsonErr(w, http.StatusNotFound, err.Error())
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, meta.Backup))
	_, _ = io.WriteString(w, content)
}

func (s *Server) handleRollback(w http.ResponseWriter, r *http.Request) {
	if s.cfg.ReadOnlyMode {
		jsonErr(w, http.StatusForbidden, "Read-only mode is enabled")
		return
	}
	var req struct {
		BackupID   string `json:"backup_id"`
		TargetFile string `json:"target_file"`
	}
	if err := decodeJSON(r, &req); err != nil {
		jsonErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	path, err := discovery.ResolvePath(s.cfg.GatusConfigPath, req.TargetFile)
	if err != nil {
		jsonErr(w, http.StatusBadRequest, err.Error())
		return
	}

	content, _, err := backup.GetContent(s.cfg.BackupDir, req.BackupID)
	if err != nil {
		jsonErr(w, http.StatusNotFound, err.Error())
		return
	}

	// Back up current file before restoring
	if existing, err := yamlutil.ReadRaw(path); err == nil {
		sess := s.sessions.Get(r)
		if _, err := backup.Create(s.cfg.BackupDir, path, existing, sess.User); err != nil {
			jsonErr(w, http.StatusInternalServerError, fmt.Sprintf("failed to create backup: %v", err))
			return
		}
	}

	if err := yamlutil.WriteRaw(path, content); err != nil {
		jsonErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonOK(w, map[string]string{"name": filepath.Base(path), "path": path, "content": content})
}

func (s *Server) handleDiff(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BackupID   string `json:"backup_id"`
		TargetFile string `json:"target_file"`
	}
	if err := decodeJSON(r, &req); err != nil {
		jsonErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	path, err := discovery.ResolvePath(s.cfg.GatusConfigPath, req.TargetFile)
	if err != nil {
		jsonErr(w, http.StatusBadRequest, err.Error())
		return
	}
	current, err := yamlutil.ReadRaw(path)
	if err != nil {
		jsonErr(w, http.StatusNotFound, "current file not found")
		return
	}
	backupContent, _, err := backup.GetContent(s.cfg.BackupDir, req.BackupID)
	if err != nil {
		jsonErr(w, http.StatusNotFound, err.Error())
		return
	}
	diff := backup.Diff(backupContent, current)
	jsonOK(w, map[string]string{"diff": diff, "backup_id": req.BackupID, "target_file": req.TargetFile})
}

// Gatus / Docker handlers

func (s *Server) handleGatusStatus(w http.ResponseWriter, r *http.Request) {
	st := docker.GetStatus(s.cfg.GatusContainerName)
	jsonOK(w, map[string]any{
		"name":             st.Name,
		"container_id":     st.ContainerID,
		"status":           st.Status,
		"image":            st.Image,
		"started_at":       nullStr(st.StartedAt),
		"health":           nullStr(st.Health),
		"docker_available": st.Available,
		"error":            nullStr(st.Error),
	})
}

func (s *Server) handleGatusRestart(w http.ResponseWriter, r *http.Request) {
	if !s.cfg.AllowDockerRestart {
		jsonErr(w, http.StatusForbidden, "Docker restart is disabled")
		return
	}
	if err := docker.Restart(s.cfg.GatusContainerName); err != nil {
		jsonErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	st := docker.GetStatus(s.cfg.GatusContainerName)
	jsonOK(w, map[string]any{
		"success": true,
		"message": "Gatus container restarted successfully",
		"status": map[string]any{
			"name":             st.Name,
			"container_id":     st.ContainerID,
			"status":           st.Status,
			"image":            st.Image,
			"started_at":       nullStr(st.StartedAt),
			"health":           nullStr(st.Health),
			"docker_available": st.Available,
		},
	})
}

func (s *Server) handleGatusLogs(w http.ResponseWriter, r *http.Request) {
	tailStr := r.URL.Query().Get("tail")
	tail := 100
	if tailStr != "" {
		fmt.Sscanf(tailStr, "%d", &tail)
	}
	if tail < 1 {
		tail = 1
	}
	if tail > 5000 {
		tail = 5000
	}
	logs, err := docker.Logs(s.cfg.GatusContainerName, tail)
	if err != nil {
		jsonErr(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	jsonOK(w, map[string]string{"logs": logs, "container_name": s.cfg.GatusContainerName})
}

func (s *Server) handleGatusEndpoints(w http.ResponseWriter, r *http.Request) {
	url := strings.TrimRight(s.cfg.GatusAPIURL, "/") + "/api/v1/endpoints/statuses"
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		jsonErr(w, http.StatusServiceUnavailable,
			fmt.Sprintf("Cannot reach Gatus API at %s: %v", s.cfg.GatusAPIURL, err))
		return
	}
	defer resp.Body.Close()

	var data []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		jsonErr(w, http.StatusBadGateway, "invalid response from Gatus API")
		return
	}

	type epStatus struct {
		Key            string `json:"key"`
		Name           string `json:"name"`
		Group          string `json:"group"`
		Success        *bool  `json:"success"`
		LastDurationMs *int64 `json:"last_duration_ms"`
	}

	result := make([]epStatus, 0, len(data))
	for _, ep := range data {
		var s bool
		var durMs int64
		var hasResult bool
		if results, ok := ep["results"].([]interface{}); ok && len(results) > 0 {
			if last, ok := results[len(results)-1].(map[string]interface{}); ok {
				s, _ = last["success"].(bool)
				if dur, ok := last["duration"].(float64); ok {
					durMs = int64(dur) / 1_000_000
				}
				hasResult = true
			}
		}
		item := epStatus{
			Key:   str(ep["key"]),
			Name:  str(ep["name"]),
			Group: str(ep["group"]),
		}
		if hasResult {
			item.Success = &s
			item.LastDurationMs = &durMs
		}
		result = append(result, item)
	}
	jsonOK(w, result)
}

// Frontend SPA

func (s *Server) handleFrontend(w http.ResponseWriter, r *http.Request) {
	staticDir := filepath.Join(filepath.Dir(os.Args[0]), "static")
	// Fallback path for dev builds
	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		staticDir = "./static"
	}

	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		jsonErr(w, http.StatusServiceUnavailable, "frontend not built")
		return
	}

	// Serve real files (JS, CSS, images, fonts)
	urlPath := strings.TrimPrefix(r.URL.Path, "/")
	if urlPath != "" {
		filePath := filepath.Join(staticDir, filepath.Clean("/"+urlPath))
		if info, err := os.Stat(filePath); err == nil && !info.IsDir() {
			http.ServeFile(w, r, filePath)
			return
		}
	}

	// SPA fallback
	http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
}

// ── utilities ─────────────────────────────────────────────────────────────────

func generateToken() string {
	b := make([]byte, 32)
	f, _ := os.Open("/dev/urandom")
	_, _ = io.ReadFull(f, b)
	_ = f.Close()
	return fmt.Sprintf("%x", b)
}

func nullStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func str(v interface{}) string {
	s, _ := v.(string)
	return s
}

func splitTrim(s, sep string) []string {
	var out []string
	for _, p := range strings.Split(s, sep) {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

// ── main ──────────────────────────────────────────────────────────────────────

func main() {
	cfg := config.Load()

	srv, err := NewServer(cfg)
	if err != nil {
		log.Fatalf("server init: %v", err)
	}

	httpSrv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      srv.Routes(),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("Gatus Config Editor listening on :%s", cfg.Port)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = httpSrv.Shutdown(ctx)
	log.Println("Server stopped")
}
