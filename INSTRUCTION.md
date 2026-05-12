# INSTRUCTION.md

## Project: Gatus Configuration Web UI

Create a complete, production-ready web UI for managing Gatus configuration.

The product is **Gatus**, from the official repository:

<https://github.com/TwiN/gatus>

Before implementing, inspect the official Gatus GitHub repository and documentation to understand the current configuration schema, supported endpoint types, alerting providers, storage options, UI options, security options, and runtime behavior.

Use these references as the source of truth:

- <https://github.com/TwiN/gatus>
- <https://github.com/TwiN/gatus/blob/master/config/config.go>
- <https://github.com/TwiN/gatus/blob/master/config.yaml>
- <https://gatus.io/docs>

Do not invent unsupported Gatus options. If a feature is uncertain, preserve it in raw YAML mode and document the limitation.

---

## Critical Workflow Requirement

This project must be generated incrementally.

Work in checkpoints. Do **not** generate the entire project in one uninterrupted response.

Before creating or modifying code, first provide a concise implementation plan and divide the work into checkpoints.

After each checkpoint:

- Stop.
- Summarize what was created or changed.
- List the files generated or modified.
- Mention any assumptions made.
- Mention any validation or tests performed.
- Update `CHECKPOINT.md`.
- Ask for approval before continuing to the next checkpoint.

Do not proceed to the next checkpoint until I explicitly say:

```text
continue
```

or:

```text
approved
```

Never continue generating code automatically after a checkpoint summary.

---

## Background

Gatus is a developer-oriented status page and health monitoring tool.

It supports health checks for HTTP, ICMP, DNS, TCP, UDP, TLS, STARTTLS, SSH, gRPC, WebSocket, domain expiration, and push-based external checks.

It supports alerting providers, storage backends, UI customization, security, maintenance windows, announcements, metrics, and more.

The goal is to build a Docker-deployable admin web application that allows a user to manage Gatus configuration safely and restart or reload the Gatus container.

---

## Core Goal

Create a browser-based admin UI for managing one or more Gatus YAML configuration files through a **form-based editor first**.

The primary user experience must be structured forms, not raw YAML editing.

The app should let users create, edit, validate, save, back up, roll back, and restart/reload Gatus without needing to manually write YAML. Raw YAML editing must still exist, but only as an advanced mode for expert users and unsupported fields.

The generated project must be complete, runnable, and must not contain placeholders.

---

## Required Stack

- Backend: Go
- Frontend: React
- YAML editor: Monaco Editor or CodeMirror with YAML support
- Docker control: Docker Engine API through `/var/run/docker.sock`, not shell commands
- Deployment: Docker Compose

---

## Core Features

### 1. Form-Based Gatus Configuration Editor

The app must provide a **form-based editor as the primary interface**.

Users should be able to manage Gatus configuration through structured forms, dropdowns, toggles, repeatable sections, condition builders, provider-specific alert forms, and validation panels.

Raw YAML editing must not be the default or primary workflow.

The form editor must support the full Gatus configuration surface as currently documented in the official repo/docs.

At minimum, include form-based UI support for these top-level Gatus config sections when available in the current schema:

- `endpoints`
- `external-endpoints`
- `suites`
- `alerting`
- `storage`
- `web`
- `ui`
- `security`
- `maintenance`
- `remote`
- `connectivity`
- `tunneling`
- `announcements`
- `metrics`
- `skip-invalid-config-update`
- `concurrency`

Do not hardcode only a small subset. Inspect the current repository and docs, then build a schema-aware form editor.

The app must parse existing Gatus YAML into editable form state and serialize form state back into valid Gatus YAML.

The form editor must preserve unknown fields, advanced fields, comments where feasible, and unsupported sections without silently deleting them.

---

### 2. Endpoint Support

The UI must support creating, editing, duplicating, deleting, and reordering endpoints.

Each endpoint editor should support common fields such as:

- `name`
- `group`
- `url`
- `interval`
- `conditions`
- `alerts`
- `client`
- `headers`
- `body`
- `method`
- `graphql`
- `dns`
- `tcp`
- `udp`
- `tls`
- `ssh`
- `grpc`
- `websocket`
- `domain-expiration`
- `ui`
- `maintenance-windows`

Also support endpoint types and protocols documented by Gatus, including:

- HTTP / HTTPS
- ICMP ping
- DNS
- TCP
- UDP
- TLS
- STARTTLS
- SSH
- gRPC
- WebSocket
- domain expiration checks
- push-based external endpoints

The endpoint editor must be form-based.

Endpoint form requirements:

- Endpoint list grouped by `group`
- Add endpoint button
- Duplicate endpoint button
- Delete endpoint with confirmation
- Reorder endpoints
- Enable/disable endpoint where supported
- Endpoint type selector
- Protocol-specific field panels
- Basic fields panel
- Request/client options panel
- Conditions panel
- Alerts panel
- Maintenance windows panel
- Advanced key/value fields panel for unknown or less common fields
- Preview generated YAML for the selected endpoint

Do not require users to manually write endpoint YAML for normal use.

---

### 3. Conditions Editor

Provide a dedicated conditions editor with:

- Add, remove, and reorder condition rows
- Examples of common Gatus conditions
- Raw condition editing for advanced users

Support documented Gatus placeholders such as:

- `[STATUS]`
- `[BODY]`
- `[RESPONSE_TIME]`
- `[CERTIFICATE_EXPIRATION]`
- `[DOMAIN_EXPIRATION]`
- `[CONNECTED]`
- DNS-related placeholders

Support functions and condition patterns documented by Gatus.

Do not fully reimplement Gatus condition evaluation, but validate obvious mistakes.

---

### 4. Alerting Configuration

Support Gatus alerting providers based on the official docs.

The UI should include configurable forms for providers such as:

- Slack
- Discord
- Email
- PagerDuty
- Microsoft Teams
- Telegram
- Gotify
- Google Chat
- Pushover
- Twilio
- GitHub
- GitLab
- Gitea
- Matrix
- Mattermost
- Opsgenie
- Ilert
- Incident.io
- Ntfy
- AWS SES
- Messagebird
- SIGNL4
- n8n
- Custom webhook

Also support endpoint-level alert configuration.

Secrets must be handled carefully:

- Do not log secrets.
- Mask secret fields in the UI.
- Preserve existing secret values unless explicitly changed.
- Allow secrets to be loaded from environment variables where Gatus supports that pattern.

---

### 5. Storage Configuration

Support Gatus storage configuration based on the current docs.

Include UI support for storage backends such as:

- memory
- sqlite
- postgres
- mysql
- other officially supported storage backends if present in the current docs

Include fields for path, connection string, caching, retention, and other documented options.

---

### 6. UI, Web, and Security Settings

Support configuration for:

- Gatus web server options
- Gatus UI customization
- Branding
- Title
- Logo
- Links
- Buttons
- Custom CSS or appearance-related options if supported
- Security settings
- Private status page settings
- Authentication settings supported by Gatus
- Access control options where documented

---

### 7. Maintenance Windows and Announcements

Support:

- Global maintenance windows
- Endpoint-specific maintenance windows if supported
- Recurring maintenance schedules if supported
- Announcements
- Active/inactive announcement states
- Announcement severity/type where supported

---

### 8. Advanced Raw YAML Mode

Include a full raw YAML editor, but only as an **advanced mode**.

The default editing experience must be the form-based editor.

Raw YAML mode is for:

- Expert users
- Bulk edits
- Unsupported Gatus fields
- Troubleshooting
- Verifying generated YAML

Raw YAML mode must:

- Use syntax highlighting
- Support search
- Support formatting
- Show line numbers
- Validate YAML syntax
- Preserve comments as much as possible
- Preserve unknown fields
- Support multi-document or multi-file Gatus configuration if Gatus supports it

---

### 9. Multi-File Configuration Support

Gatus supports `GATUS_CONFIG_PATH`.

If `GATUS_CONFIG_PATH` points to a directory, Gatus can load multiple `.yaml` / `.yml` files and merge them.

The UI must support both modes.

#### Single-File Mode

Edit one config file, for example:

```text
/config/config.yaml
```

#### Directory Mode

Support:

- List all `.yaml` and `.yml` files under the config directory
- Create new config files
- Rename config files safely
- Delete config files with confirmation
- Edit individual files
- Show the effective merged configuration if practical
- Validate all files together before restart/reload

Environment variable:

```env
GATUS_CONFIG_PATH=/config/config.yaml
```

or:

```env
GATUS_CONFIG_PATH=/config
```

---

## Validation

Validation should happen in layers.

### A. YAML Validation

- Validate syntax.
- Show exact line and column errors.

### B. Basic Schema Validation

- Check common required fields.
- Check endpoints have valid names.
- Check URLs/protocols match the selected endpoint type.
- Check conditions are non-empty strings.
- Check alert provider config has required fields.

### C. Gatus-Native Validation

Prefer using the actual Gatus binary or container for validation if feasible.

Implement one of these approaches:

- Run the official Gatus container against a temporary config file and capture validation errors.
- Call an internal validation helper that uses the Gatus config package if implemented in Go.
- Document why native validation is unavailable and fall back to schema validation.

Do not save invalid config unless the user explicitly chooses a force-save option.

---

## Save, Backup, and Rollback

Before saving any file:

- Create a timestamped backup.
- Store backups under `/config/backups`.
- Include filename, timestamp, user, and checksum metadata.
- Allow viewing backup contents.
- Allow diffing current config vs backup.
- Allow restoring a backup.
- Allow downloading backup files.

Example backup:

```text
/config/backups/config-2026-05-12-143000.yaml
```

---

## Restart / Reload Gatus

The app must be able to restart the running Gatus container.

Use Docker Engine API through the mounted Docker socket:

```text
/var/run/docker.sock
```

Do not use shell commands like `docker restart`.

Environment variable:

```env
GATUS_CONTAINER_NAME=gatus
```

Features:

- Show current Gatus container status.
- Show image name and container ID.
- Show last restart time if available.
- Button: `Restart Gatus`
- Confirmation dialog before restart.
- Restart after save option.
- Manual restart option.
- Show success/failure state.
- Show logs from the Gatus container after restart.
- Show whether the container became healthy after restart if healthcheck is configured.

Also account for Gatus config reload behavior.

Gatus can reload configuration when the loaded config file changes. The UI should explain this and still provide restart when the user wants a full restart.

---

## Docker Compose Deployment

Generate:

- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- README instructions

Compose should include:

- Official Gatus container
- Gatus config UI container
- Shared config volume
- Docker socket mount for the UI container
- Optional persistent data volume for Gatus storage
- Network configuration
- Healthchecks

Example environment variables:

```env
APP_PORT=8080
GATUS_CONFIG_PATH=/config/config.yaml
GATUS_CONTAINER_NAME=gatus
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
SESSION_SECRET=change-me
BACKUP_DIR=/config/backups
ALLOW_DOCKER_RESTART=true
READ_ONLY_MODE=false
```

---

## Security

Security is critical because mounting the Docker socket gives the UI container high privileges.

Implement:

- Username/password login
- Session-based authentication
- Secure password hashing
- CSRF protection if applicable
- Rate limiting on login
- Secure cookies
- Configurable session secret
- No secrets in logs
- Optional read-only mode
- Optional disable-restart mode
- Clear security warning in README
- Recommendation to run behind a reverse proxy with TLS

Do not expose this UI publicly without authentication.

---

## API Design

Backend REST API should include at least:

- `GET /api/health`
- `GET /api/config/files`
- `GET /api/config/file`
- `POST /api/config/file`
- `POST /api/config/validate`
- `POST /api/config/save`
- `GET /api/config/backups`
- `GET /api/config/backups/{id}`
- `POST /api/config/rollback`
- `GET /api/config/diff`
- `GET /api/gatus/status`
- `POST /api/gatus/restart`
- `GET /api/gatus/logs`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

All API errors must return structured JSON.

---

## Frontend Pages

Create these pages.

### A. Dashboard

Show:

- Gatus container status
- Config path
- Number of config files
- Number of endpoints
- Last saved time
- Last restart time
- Validation status

### B. Endpoints

Support:

- List endpoints
- Filter by group
- Add endpoint
- Edit endpoint
- Duplicate endpoint
- Delete endpoint
- Condition editor
- Alert editor

### C. Configuration

Support:

- Form-based editor for supported top-level sections
- Section-specific forms for endpoints, alerting, storage, web, UI, security, maintenance, announcements, remote, connectivity, tunneling, metrics, and suites where supported
- Generated YAML preview
- Advanced raw YAML editor
- Validation panel

The form editor must be the default tab. Raw YAML must be an advanced tab.

### D. Backups

Support:

- List backups
- View backup
- Diff backup
- Restore backup

### E. Restart / Logs

Support:

- Gatus status
- Restart button
- Recent logs
- Healthcheck result

### F. Settings

Support:

- Config path display
- Backup directory display
- Restart behavior
- Read-only mode
- Security notice

---

## UX Requirements

- Modern clean UI
- Responsive layout
- Loading states
- Toast notifications
- Confirmation dialogs for destructive actions
- Dirty-state detection for unsaved changes
- Keyboard shortcut for save
- Inline validation errors
- Preserve comments and unknown YAML keys where possible
- Never silently discard unsupported fields

---

## README Requirements

The README must include:

- Project overview
- Architecture
- Setup with Docker Compose
- How to mount an existing Gatus config
- How to use single-file mode
- How to use directory config mode
- How restart works through Docker socket
- Security risks of Docker socket
- How backups and rollback work
- How validation works
- Limitations
- Troubleshooting
- Example screenshots or UI descriptions
- Upgrade notes for Gatus schema changes

---

## Example Files

Include:

- Sample `config.yaml`
- Sample multi-file config directory
- `.env.example`
- `docker-compose.yml`
- Test data for validation
- Basic unit tests for config loading, backup, validation, and Docker restart logic

---

## Checkpoints

### Checkpoint 1 — Research and Schema Mapping

- Inspect the official Gatus repository and documentation.
- Identify supported Gatus configuration sections.
- Identify endpoint types, alerting providers, storage options, web/UI/security settings, maintenance windows, announcements, and config reload behavior.
- Produce a schema/features summary.
- Do not write application code yet.
- Update `CHECKPOINT.md`.

### Checkpoint 2 — Project Scaffold

- Create the repository structure.
- Add backend, frontend, Docker, and configuration directories.
- Add initial README, `.env.example`, `Dockerfile`, and `docker-compose.yml`.
- Do not implement full business logic yet.
- Update `CHECKPOINT.md`.

### Checkpoint 3 — Backend Foundation

- Implement Go app structure.
- Add authentication/session foundation.
- Add config file discovery.
- Add YAML load/save utilities.
- Add health endpoint.
- Add initial tests.
- Update `CHECKPOINT.md`.

### Checkpoint 4 — Gatus Config Validation

- Implement YAML validation.
- Implement basic Gatus-aware schema checks.
- Add optional native Gatus validation strategy if feasible.
- Add structured validation errors.
- Add tests.
- Update `CHECKPOINT.md`.

### Checkpoint 5 — Backup, Rollback, and Diff

- Implement backup creation before save.
- Implement backup listing.
- Implement backup viewing.
- Implement rollback.
- Implement current-vs-backup diff.
- Add tests.
- Update `CHECKPOINT.md`.

### Checkpoint 6 — Docker / Gatus Container Control

- Implement Docker Engine API integration.
- Add Gatus container status.
- Add restart endpoint.
- Add logs endpoint.
- Add healthcheck/result detection where possible.
- Add tests with mocks.
- Update `CHECKPOINT.md`.

### Checkpoint 7 — Frontend Foundation

- Implement React app layout.
- Add routing.
- Add authentication pages.
- Add dashboard shell.
- Add API client.
- Add shared UI components.
- Update `CHECKPOINT.md`.

### Checkpoint 8 — Form-Based Configuration Editor

- Implement the primary form-based configuration editor.
- Add section navigation for Gatus top-level config sections.
- Add generated YAML preview from form state.
- Implement load existing YAML into form state.
- Implement serialize form state back to YAML.
- Preserve unknown YAML fields where possible.
- Show validation errors inline.
- Add save confirmation.
- Add restart-after-save option.
- Update `CHECKPOINT.md`.

### Checkpoint 9 — Endpoint, Conditions, and Provider Forms

- Add structured forms for endpoints.
- Add endpoint type selector and protocol-specific panels.
- Add conditions editor.
- Add alerting provider forms.
- Add endpoint-level alert editor.
- Add storage editor.
- Add web/UI/security/maintenance/announcement forms.
- Add advanced key/value fallback fields for unsupported options.
- Preserve unknown YAML fields.
- Update `CHECKPOINT.md`.

### Checkpoint 9B — Advanced Raw YAML Editor

- Add Monaco Editor or CodeMirror as an advanced editor mode.
- Implement load, edit, validate, save, and dirty-state behavior.
- Show validation errors.
- Keep this mode secondary to the form-based editor.
- Update `CHECKPOINT.md`.

### Checkpoint 10 — Backups, Logs, and Operations UI

- Add backups page.
- Add diff viewer.
- Add rollback flow.
- Add restart/status page.
- Add recent logs viewer.
- Update `CHECKPOINT.md`.

### Checkpoint 11 — Security Hardening

- Add login rate limiting.
- Add secure cookies.
- Add CSRF protection if applicable.
- Add read-only mode.
- Add disable-restart mode.
- Ensure secrets are masked and not logged.
- Update `CHECKPOINT.md`.

### Checkpoint 12 — Final Integration

- Complete Docker Compose integration.
- Add sample configs.
- Finish README.
- Run tests.
- Verify the app starts with:

```bash
docker compose up -d
```

- Provide final project tree and usage instructions.
- Update `CHECKPOINT.md`.

---

## CHECKPOINT.md Requirement

Create and maintain a `CHECKPOINT.md` file from the beginning of the project.

`CHECKPOINT.md` must be updated after every checkpoint and whenever meaningful implementation progress is made.

The file must include:

- Current checkpoint
- Overall status
- Completed checkpoints
- Pending checkpoints
- Files created
- Files modified
- Decisions made
- Assumptions
- Validation performed
- Known issues
- Next checkpoint
- Approval status

Do not proceed to the next checkpoint unless the latest checkpoint is marked as approved by the user.

---

## Final Output Requirement

Generate the complete project structure with all files.

The final project should run with:

```bash
docker compose up -d
```

Then the UI should be available at:

```text
http://localhost:8080
```

Use the official Gatus repository and documentation as the source of truth.

The final product must feel like an admin dashboard with forms, not just a YAML editor with extra buttons.