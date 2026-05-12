# CHECKPOINT.md

## Project

Gatus Configuration Web UI

## Overall Status

All checkpoints complete. Project published to GitHub with Docker image on GHCR.

## Current Checkpoint

Complete — Go backend rewrite and production publish done.

---

## Checkpoint Tracker

| Checkpoint | Name | Status | Approved |
|---|---|---:|---:|
| 1 | Research and Schema Mapping | Complete | Yes |
| 2 | Project Scaffold | Complete | Yes |
| 3 | Backend Foundation | Complete | Yes |
| 4 | Gatus Config Validation | Complete | Yes |
| 5 | Backup, Rollback, and Diff | Complete | Yes |
| 6 | Docker / Gatus Container Control | Complete | Yes |
| 7 | Frontend Foundation | Complete | Yes |
| 8 | Form-Based Configuration Editor | Complete | Yes |
| 9 | Endpoint, Conditions, and Provider Forms | Complete | Yes |
| 9B | Advanced Raw YAML Editor | Complete | Yes |
| 10 | Backups, Logs, and Operations UI | Complete | Yes |
| 11 | Security Hardening | Complete | Yes |
| 12 | Final Integration + Go Rewrite | Complete | Yes |

---

## Architecture (Final)

Single Docker container: Go binary + React SPA (~35 MB image, ~15–25 MB RAM).

```
backend/
├── main.go                  chi router, all HTTP handlers, SPA serve
├── go.mod
└── internal/
    ├── config/              Env-var configuration (AppConfig struct)
    ├── session/             gorilla/securecookie signed+encrypted cookies
    ├── ratelimit/           In-memory per-IP rate limiter (sync.Mutex)
    ├── discovery/           Config file discovery + path traversal guard
    ├── yamlutil/            YAML read / write / validate
    ├── validator/           Gatus schema validation
    ├── backup/              Backup, rollback, unified diff
    └── docker/              Docker Engine API (raw HTTP over Unix socket)

frontend/
└── src/
    ├── api/                 Axios client, CSRF interceptor, type definitions
    ├── components/          Layout, UI primitives, config forms, endpoint forms
    ├── pages/               Dashboard, Config, Endpoints, Backups, Operations
    ├── stores/              Zustand auth store
    └── utils/               YAML parse/dump (js-yaml)
```

---

## Completed Checkpoints

### Checkpoint 1 — Research and Schema Mapping

Status: Complete

Mapped all 18 top-level Gatus config keys, 41 alerting providers, 12 URL-scheme endpoint types, and condition syntax. Used as reference for validator and form implementations.

---

### Checkpoint 2 — Project Scaffold

Status: Complete

Files created:
- `docker-compose.yml` — gatus + app services
- `docker-compose.prod.yml` — uses ghcr.io pre-built image
- `Dockerfile` — 3-stage: Node → Go → Alpine
- `.env.example`
- `config/config.yaml` — sample Gatus config
- `frontend/` — Vite + React + TypeScript scaffold
- `backend/` — Go module scaffold

---

### Checkpoint 3 — Backend Foundation (Go)

Status: Complete

Files created:
- `backend/main.go` — chi router, auth handlers, config CRUD, SPA serve
- `backend/go.mod`
- `backend/internal/config/config.go` — AppConfig from env vars
- `backend/internal/session/session.go` — gorilla/securecookie, HttpOnly, SameSite=Lax
- `backend/internal/discovery/discovery.go` — path traversal guard, .yaml/.yml only

Key decisions:
- Session: signed+encrypted cookie via gorilla/securecookie. No server-side session store.
- SPA catch-all: serve real static files verbatim; fall back to `index.html` for all other paths.
- All mutating endpoints require auth. Login endpoint is CSRF-exempt (bootstrap path).

---

### Checkpoint 4 — Gatus Config Validation

Status: Complete

Files created:
- `backend/internal/validator/validator.go`
- `backend/internal/yamlutil/yamlutil.go`

Endpoints added:
- `POST /api/config/validate` — two-layer: YAML syntax + schema check. Always 200 with valid/errors/warnings payload.

Key decisions:
- 18 known top-level keys; unknown keys produce warnings, not errors.
- 41 alerting providers validated.
- Native Gatus validation unavailable (no `--validate` flag in binary).

---

### Checkpoint 5 — Backup, Rollback, and Diff

Status: Complete

Files created:
- `backend/internal/backup/backup.go`

Endpoints added:
- `POST /api/config/save` — validate then save with backup; `force=true` bypasses validation
- `GET /api/config/backups` — list backups
- `GET /api/config/backups/{id}` — get backup content
- `GET /api/config/backups/{id}/download` — download backup
- `POST /api/config/rollback` — restore backup (backs up current first)
- `POST /api/config/diff` — unified diff between backup and current

Key decisions:
- Backup filename: `{stem}-{YYYYMMDD-HHmmss}{ext}`
- Metadata sidecar: `{backup}.meta.json` with original name, timestamp, user, sha256
- Rollback always backs up current file first

---

### Checkpoint 6 — Docker / Gatus Container Control

Status: Complete

Files created:
- `backend/internal/docker/docker.go`

Endpoints added:
- `GET /api/gatus/status` — container status (never 5xx; returns `docker_available: false` on error)
- `POST /api/gatus/restart` — restart via Docker Engine API
- `GET /api/gatus/logs?tail=N` — last N log lines (1–5000)
- `GET /api/gatus/endpoints` — proxy to Gatus API, returns simplified status

Key decisions:
- Raw HTTP over `/var/run/docker.sock` — no Docker SDK dependency
- `POST /containers/{name}/restart?t=30` used for graceful restart
- Restart disabled if `ALLOW_DOCKER_RESTART=false` → 403

---

### Checkpoint 7 — Frontend Foundation

Status: Complete

Files created:
- `frontend/src/api/client.ts` — axios, CSRF interceptor, 401 auto-redirect
- `frontend/src/api/auth.ts` — login/logout/me, manages CSRF token
- `frontend/src/api/config.ts`
- `frontend/src/api/gatus.ts`
- `frontend/src/stores/authStore.ts` — zustand
- `frontend/src/types/gatus.ts` — full GatusConfig TypeScript types
- `frontend/src/components/layout/` — Layout, Sidebar, Navbar
- `frontend/src/components/ui/` — Spinner, Badge, Modal, ConfirmDialog, ValidationPanel
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/DashboardPage.tsx`

---

### Checkpoint 8 — Form-Based Configuration Editor

Status: Complete

Files created:
- `frontend/src/components/config/StorageForm.tsx`
- `frontend/src/components/config/WebForm.tsx`
- `frontend/src/components/config/UIForm.tsx`
- `frontend/src/components/config/SecurityForm.tsx`
- `frontend/src/components/config/MaintenanceForm.tsx`
- `frontend/src/components/config/AnnouncementsForm.tsx`
- `frontend/src/components/config/AlertingForm.tsx`
- `frontend/src/pages/ConfigPage.tsx`
- `frontend/src/utils/yaml.ts`
- `frontend/src/utils/yamlParse.ts`
- `frontend/src/hooks/useDirty.ts`

Key decisions:
- ConfigPage has section nav: Alerting | Storage | Web | UI | Security | Maintenance | Announcements | Raw YAML
- Form saves reconstruct YAML via js-yaml (may lose comments)
- Raw YAML editor preserves comments
- Force Save bypasses validation

---

### Checkpoint 9 — Endpoint, Conditions, and Provider Forms

Status: Complete

Files created:
- `frontend/src/components/endpoints/ConditionsEditor.tsx`
- `frontend/src/components/endpoints/AlertsEditor.tsx`
- `frontend/src/components/endpoints/EndpointForm.tsx`
- `frontend/src/pages/EndpointsPage.tsx`

Key decisions:
- AlertsEditor restricted to providers configured in `alerting:` block (not all 41 providers)
- EndpointForm tabbed: Basic | Conditions | Alerts | Client | Maintenance | Advanced
- Group-based view with collapsible groups
- Live status dots and response time badges (30s auto-refresh via Gatus API proxy)

---

### Checkpoint 9B — Advanced Raw YAML Editor

Status: Complete

Files created:
- `frontend/src/components/config/RawYamlEditor.tsx`

Key decisions:
- Monaco Editor with YAML language, line numbers, word wrap
- Ctrl+S / Cmd+S shortcut wired to save
- Labeled "Advanced mode" with warning banner about comment loss on form saves

---

### Checkpoint 10 — Backups, Logs, and Operations UI

Status: Complete

Files created:
- `frontend/src/pages/BackupsPage.tsx`
- `frontend/src/pages/OperationsPage.tsx`

Key decisions:
- BackupsPage: view/diff/download/restore actions; diff uses react-diff-viewer-continued
- OperationsPage: container status (auto-refresh 15s), log viewer (auto-refresh 30s)
- Restart requires confirmation; disabled if `docker_available=false`

---

### Checkpoint 11 — Security Hardening

Status: Complete

Files modified:
- `backend/main.go` — CSRF middleware, rate limiter, security headers, session cookie hardening
- `backend/internal/ratelimit/ratelimit.go` — 5 failures/5 min per IP → 15-min lockout
- `backend/internal/session/session.go` — HttpOnly, SameSite=Lax, configurable Secure flag
- `frontend/src/api/client.ts` — X-CSRF-Token header interceptor
- `frontend/src/api/auth.ts` — login/logout/getMe manage CSRF token
- `.env.example` — added HTTPS_ONLY, CSRF_ENABLED

Key decisions:
- CSRF: stateless double-submit. Token generated at login, stored in signed session cookie, returned in response body. Frontend sends as X-CSRF-Token header. Validated with constant-time compare.
- Login endpoint CSRF-exempt (bootstrap path — no token exists yet).
- Rate limiter: in-memory with sync.Mutex (single-container safe).
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy.
- ADMIN_PASSWORD and SESSION_SECRET never logged.

---

### Checkpoint 12 — Final Integration + Go Rewrite

Status: Complete

Actions completed:
- Rewrote Python/FastAPI backend to Go (chi router, gorilla/securecookie, gopkg.in/yaml.v3)
- Docker image reduced from ~200 MB to ~35 MB; RAM from ~60–90 MB to ~15–25 MB
- Published to `https://github.com/dwiprawira/gatus-config-editor`
- GitHub Actions workflow builds and pushes to `ghcr.io/dwiprawira/gatus-config-editor:latest` on push to `main`
- Added `docker-compose.prod.yml` for production deploy via pre-built image
- Added UI screenshots (docs/*.jpeg) to README.md
- Reverted `config/config.yaml` to safe sample config
- Fixed all markdown files to reflect Go backend

Files created:
- `.github/workflows/docker.yml` — build + push to GHCR on main
- `docker-compose.prod.yml` — production deploy with named volume
- `docs/*.jpeg` — UI screenshots (login, dashboard, endpoints, configuration-ui, configuration-alert, restart-logs)
- `public/favicon.svg` — blue rounded square with heartbeat line

---

## Known Limitations

- `remote` config aggregation, `connectivity`, `tunneling`, `suites` sections not form-editable (preserved in raw YAML)
- YAML comments lost when saving via form editor (raw YAML editor preserves them)
- Rate limiter is in-memory — not suitable for multi-instance deployments
- Native Gatus config validation unavailable (Gatus has no `--validate` flag)
- Storage backends: memory, sqlite, postgres (mysql not in current Gatus source)
