package ratelimit

import (
	"net/http/httptest"
	"testing"
	"time"
)

func TestIPDoesNotTrustXForwardedForByDefault(t *testing.T) {
	req := httptest.NewRequest("POST", "/login", nil)
	req.RemoteAddr = "203.0.113.10:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.99")

	if got := ip(req); got != "203.0.113.10" {
		t.Fatalf("ip() = %q, want RemoteAddr", got)
	}
}

func TestLockoutLastsLongerThanFailureWindow(t *testing.T) {
	l := New()
	req := httptest.NewRequest("POST", "/login", nil)
	req.RemoteAddr = "203.0.113.10:12345"
	for i := 0; i < maxAttempts; i++ {
		l.RecordFailure(req)
	}
	addr := ip(req)
	l.store[addr].windowStart = time.Now().Add(-(windowSeconds + 1) * time.Second)
	l.store[addr].lockedUntil = time.Now().Add(time.Minute)

	if msg := l.Check(req); msg == "" {
		t.Fatalf("expected request to remain locked after failure window while lockedUntil is in future")
	}
}
