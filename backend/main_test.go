package main

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"gatus-config-editor/internal/config"
	"gatus-config-editor/internal/session"
)

func secureTestConfig() *config.Config {
	return &config.Config{
		GatusConfigPath:    tTempConfigPath,
		GatusContainerName: "gatus",
		AdminUsername:      "admin",
		AdminPassword:      "not-the-default-password",
		SessionSecret:      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		BackupDir:          tTempConfigPath + "/backups",
		AllowDockerRestart: true,
		ReadOnlyMode:       false,
		HTTPSOnly:          false,
		CSRFEnabled:        true,
		Port:               "0",
	}
}

const tTempConfigPath = "/tmp/gatus-config-editor-test/config.yaml"

func TestNewServerRejectsInsecureDefaults(t *testing.T) {
	cfg := secureTestConfig()
	cfg.AdminPassword = "change-me"
	if _, err := NewServer(cfg); err == nil {
		t.Fatalf("NewServer should reject default admin password")
	}

	cfg = secureTestConfig()
	cfg.SessionSecret = "change-me-in-production"
	if _, err := NewServer(cfg); err == nil {
		t.Fatalf("NewServer should reject default session secret")
	}
}

func TestCSRFProtectRejectsAuthenticatedSessionWithoutToken(t *testing.T) {
	srv, err := NewServer(secureTestConfig())
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}

	hit := false
	handler := srv.csrfProtect(func(w http.ResponseWriter, r *http.Request) {
		hit = true
		w.WriteHeader(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodPost, "/mutate", nil)
	sessionRR := httptest.NewRecorder()
	if err := srv.sessions.Save(sessionRR, &session.Data{User: "admin"}); err != nil {
		t.Fatalf("save session: %v", err)
	}
	for _, c := range sessionRR.Result().Cookies() {
		req.AddCookie(c)
	}

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if hit {
		t.Fatalf("mutation handler was called without CSRF token")
	}
	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusForbidden)
	}
}

func TestLoginRateLimitDoesNotTrustXForwardedForThroughRoutes(t *testing.T) {
	srv, err := NewServer(secureTestConfig())
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	routes := srv.Routes()

	for i := 0; i < 6; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(`{"username":"admin","password":"wrong"}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Forwarded-For", fmt.Sprintf("198.51.100.%d", i+1))
		req.RemoteAddr = "203.0.113.10:12345"
		rr := httptest.NewRecorder()
		routes.ServeHTTP(rr, req)

		if i < 5 && rr.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d status = %d, want %d", i+1, rr.Code, http.StatusUnauthorized)
		}
		if i == 5 && rr.Code != http.StatusTooManyRequests {
			t.Fatalf("attempt %d status = %d, want %d", i+1, rr.Code, http.StatusTooManyRequests)
		}
	}
}
