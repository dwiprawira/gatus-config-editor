package validator

import (
	"fmt"
	"regexp"

	"gatus-config-editor/internal/yamlutil"
)

type Issue struct {
	Field    string `json:"field"`
	Message  string `json:"message"`
	Severity string `json:"severity"` // "error" | "warning"
}

type Result struct {
	Valid                    bool    `json:"valid"`
	Errors                   []Issue `json:"errors"`
	Warnings                 []Issue `json:"warnings"`
	NativeValidationAvailable bool   `json:"native_validation_available"`
	NativeValidationNote     string  `json:"native_validation_note"`
}

var (
	knownTopLevel = map[string]bool{
		"debug": true, "metrics": true, "skip-invalid-config-update": true,
		"disable-monitoring-lock": true, "concurrency": true,
		"security": true, "alerting": true, "endpoints": true,
		"external-endpoints": true, "suites": true, "storage": true,
		"web": true, "ui": true, "maintenance": true, "remote": true,
		"connectivity": true, "tunneling": true, "announcements": true,
	}
	knownProviders = map[string]bool{
		"aws-ses": true, "clickup": true, "custom": true, "datadog": true,
		"discord": true, "email": true, "gitea": true, "github": true,
		"gitlab": true, "googlechat": true, "gotify": true, "homeassistant": true,
		"ifttt": true, "ilert": true, "incident-io": true, "line": true,
		"matrix": true, "mattermost": true, "messagebird": true, "n8n": true,
		"newrelic": true, "ntfy": true, "opsgenie": true, "pagerduty": true,
		"plivo": true, "pushover": true, "rocketchat": true, "sendgrid": true,
		"signal": true, "signl4": true, "slack": true, "splunk": true,
		"squadcast": true, "teams": true, "teams-workflows": true, "telegram": true,
		"twilio": true, "vonage": true, "webex": true, "zapier": true, "zulip": true,
	}
	validStorageTypes     = map[string]bool{"memory": true, "sqlite": true, "postgres": true}
	validAnnouncementTypes = map[string]bool{
		"outage": true, "warning": true, "information": true, "operational": true, "none": true,
	}
	durationRe = regexp.MustCompile(`^\d+(ms|s|m|h|d)$`)
	timeRe     = regexp.MustCompile(`^\d{2}:\d{2}$`)
)

const nativeNote = "Gatus does not expose a --validate CLI flag. Schema-based validation is used instead."

func Validate(content string) Result {
	r := Result{Valid: true, Errors: []Issue{}, Warnings: []Issue{}, NativeValidationNote: nativeNote}

	data, err := yamlutil.Parse(content)
	if err != nil {
		r.Valid = false
		r.Errors = append(r.Errors, Issue{"", fmt.Sprintf("YAML syntax error: %v", err), "error"})
		return r
	}
	if data == nil {
		return r
	}

	for k := range data {
		if !knownTopLevel[k] {
			r.Warnings = append(r.Warnings, Issue{k, fmt.Sprintf("Unknown top-level key %q", k), "warning"})
		}
	}

	if v, ok := data["endpoints"]; ok {
		checkEndpoints(v, &r)
	}
	if v, ok := data["external-endpoints"]; ok {
		checkExternalEndpoints(v, &r)
	}
	if v, ok := data["alerting"]; ok {
		checkAlerting(v, &r)
	}
	if v, ok := data["storage"]; ok {
		checkStorage(v, &r)
	}
	if v, ok := data["web"]; ok {
		checkWeb(v, &r)
	}
	if v, ok := data["maintenance"]; ok {
		checkMaintenance(v, &r)
	}
	if v, ok := data["announcements"]; ok {
		checkAnnouncements(v, &r)
	}

	if len(r.Errors) > 0 {
		r.Valid = false
	}
	return r
}

func addErr(r *Result, field, msg string) { r.Errors = append(r.Errors, Issue{field, msg, "error"}) }
func addWarn(r *Result, field, msg string) {
	r.Warnings = append(r.Warnings, Issue{field, msg, "warning"})
}

func checkEndpoints(v interface{}, r *Result) {
	eps, ok := v.([]interface{})
	if !ok {
		addErr(r, "endpoints", "must be a list")
		return
	}
	seen := map[string]bool{}
	for i, raw := range eps {
		ep, ok := raw.(map[string]interface{})
		pfx := fmt.Sprintf("endpoints[%d]", i)
		if !ok {
			addErr(r, pfx, "must be a mapping")
			continue
		}
		name, _ := ep["name"].(string)
		if name == "" {
			addErr(r, pfx+".name", "name is required")
		} else if seen[name] {
			addWarn(r, pfx+".name", fmt.Sprintf("duplicate endpoint name %q", name))
		} else {
			seen[name] = true
		}
		url, _ := ep["url"].(string)
		if url == "" {
			addErr(r, pfx+".url", "url is required")
		} else {
			checkURL(url, pfx, r)
		}
		if iv, ok := ep["interval"]; ok {
			if s, ok := iv.(string); ok && !durationRe.MatchString(s) {
				addWarn(r, pfx+".interval", fmt.Sprintf("duration %q may not be valid", s))
			}
		}
		checkConditions(ep["conditions"], pfx, r)
		checkEndpointAlerts(ep["alerts"], pfx, r)
	}
}

func checkURL(url, pfx string, r *Result) {
	idx := indexOf(url, "://")
	if idx < 0 {
		addErr(r, pfx+".url", "URL must include a scheme (e.g. https://, tcp://)")
	}
}

func indexOf(s, sub string) int {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

func checkConditions(v interface{}, pfx string, r *Result) {
	conds, ok := v.([]interface{})
	if !ok {
		return
	}
	for i, c := range conds {
		s, ok := c.(string)
		if !ok || s == "" {
			addErr(r, fmt.Sprintf("%s.conditions[%d]", pfx, i), "condition must be a non-empty string")
		}
	}
}

func checkEndpointAlerts(v interface{}, pfx string, r *Result) {
	alerts, ok := v.([]interface{})
	if !ok {
		return
	}
	for i, a := range alerts {
		alert, ok := a.(map[string]interface{})
		if !ok {
			continue
		}
		t, _ := alert["type"].(string)
		if t != "" && !knownProviders[t] {
			addWarn(r, fmt.Sprintf("%s.alerts[%d].type", pfx, i), fmt.Sprintf("unknown alert provider %q", t))
		}
	}
}

func checkExternalEndpoints(v interface{}, r *Result) {
	eps, ok := v.([]interface{})
	if !ok {
		return
	}
	for i, raw := range eps {
		ep, ok := raw.(map[string]interface{})
		pfx := fmt.Sprintf("external-endpoints[%d]", i)
		if !ok {
			continue
		}
		if name, _ := ep["name"].(string); name == "" {
			addErr(r, pfx+".name", "name is required")
		}
		if token, _ := ep["token"].(string); token == "" {
			addWarn(r, pfx+".token", "token is required for push authentication")
		}
	}
}

func checkAlerting(v interface{}, r *Result) {
	m, ok := v.(map[string]interface{})
	if !ok {
		addErr(r, "alerting", "must be a mapping")
		return
	}
	for k := range m {
		if !knownProviders[k] {
			addWarn(r, "alerting."+k, fmt.Sprintf("unknown alerting provider %q", k))
		}
	}
}

func checkStorage(v interface{}, r *Result) {
	m, ok := v.(map[string]interface{})
	if !ok {
		return
	}
	t, _ := m["type"].(string)
	if t == "" {
		t = "memory"
	}
	if !validStorageTypes[t] {
		addErr(r, "storage.type", fmt.Sprintf("unknown storage type %q (valid: memory, sqlite, postgres)", t))
	}
	if t == "sqlite" {
		if p, _ := m["path"].(string); p == "" {
			addWarn(r, "storage.path", "sqlite storage without a path — data lost on restart")
		}
	}
}

func checkWeb(v interface{}, r *Result) {
	m, ok := v.(map[string]interface{})
	if !ok {
		return
	}
	if p, ok := m["port"]; ok {
		switch pt := p.(type) {
		case int:
			if pt < 1 || pt > 65535 {
				addErr(r, "web.port", fmt.Sprintf("port %d out of range", pt))
			}
		}
	}
}

func checkMaintenance(v interface{}, r *Result) {
	m, ok := v.(map[string]interface{})
	if !ok {
		return
	}
	if s, _ := m["start"].(string); s != "" && !timeRe.MatchString(s) {
		addErr(r, "maintenance.start", fmt.Sprintf("start must be HH:MM, got %q", s))
	}
	if d, _ := m["duration"].(string); d != "" && !durationRe.MatchString(d) {
		addWarn(r, "maintenance.duration", fmt.Sprintf("duration %q may not be valid", d))
	}
}

func checkAnnouncements(v interface{}, r *Result) {
	anns, ok := v.([]interface{})
	if !ok {
		return
	}
	for i, raw := range anns {
		ann, ok := raw.(map[string]interface{})
		pfx := fmt.Sprintf("announcements[%d]", i)
		if !ok {
			continue
		}
		if msg, _ := ann["message"].(string); msg == "" {
			addErr(r, pfx+".message", "message is required")
		}
		if t, _ := ann["type"].(string); t != "" && !validAnnouncementTypes[t] {
			addErr(r, pfx+".type", fmt.Sprintf("unknown announcement type %q", t))
		}
	}
}
