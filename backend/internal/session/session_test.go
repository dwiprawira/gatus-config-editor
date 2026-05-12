package session

import (
	"net/http/httptest"
	"testing"
	"time"
)

func TestExpiredSessionIsRejected(t *testing.T) {
	m := NewManager("0123456789abcdef0123456789abcdef", false)
	rr := httptest.NewRecorder()
	if err := m.Save(rr, &Data{User: "admin", CSRFToken: "token", ExpiresAt: time.Now().Add(-time.Minute).Unix()}); err != nil {
		t.Fatalf("save: %v", err)
	}

	req := httptest.NewRequest("GET", "/", nil)
	for _, c := range rr.Result().Cookies() {
		req.AddCookie(c)
	}
	if got := m.Get(req); got.User != "" {
		t.Fatalf("expired session user = %q, want empty", got.User)
	}
}

func TestSaveAddsServerSideExpiry(t *testing.T) {
	m := NewManager("0123456789abcdef0123456789abcdef", false)
	rr := httptest.NewRecorder()
	if err := m.Save(rr, &Data{User: "admin", CSRFToken: "token"}); err != nil {
		t.Fatalf("save: %v", err)
	}

	req := httptest.NewRequest("GET", "/", nil)
	for _, c := range rr.Result().Cookies() {
		req.AddCookie(c)
	}
	got := m.Get(req)
	if got.User != "admin" {
		t.Fatalf("user = %q, want admin", got.User)
	}
	if got.ExpiresAt <= time.Now().Unix() {
		t.Fatalf("ExpiresAt was not set in future: %d", got.ExpiresAt)
	}
}
