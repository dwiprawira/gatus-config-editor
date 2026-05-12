package ratelimit

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	maxAttempts    = 5
	windowSeconds  = 300
	lockoutSeconds = 900
)

type entry struct {
	count     int
	windowStart time.Time
}

type Limiter struct {
	mu    sync.Mutex
	store map[string]*entry
}

func New() *Limiter {
	return &Limiter{store: make(map[string]*entry)}
}

func ip(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		return strings.SplitN(fwd, ",", 2)[0]
	}
	// Strip port
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i != -1 {
		host = host[:i]
	}
	return host
}

// Check returns an error message if the IP is rate-limited, or "".
func (l *Limiter) Check(r *http.Request) string {
	addr := ip(r)
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()

	e, ok := l.store[addr]
	if !ok {
		return ""
	}
	if now.Sub(e.windowStart) > windowSeconds*time.Second {
		delete(l.store, addr)
		return ""
	}
	if e.count >= maxAttempts {
		remaining := lockoutSeconds - int(now.Sub(e.windowStart).Seconds())
		if remaining < 1 {
			remaining = 1
		}
		return fmt.Sprintf("Too many failed login attempts. Try again in %d seconds.", remaining)
	}
	return ""
}

// RecordFailure increments the failure counter for the request IP.
func (l *Limiter) RecordFailure(r *http.Request) {
	addr := ip(r)
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()

	e, ok := l.store[addr]
	if !ok || now.Sub(e.windowStart) > windowSeconds*time.Second {
		l.store[addr] = &entry{count: 1, windowStart: now}
		return
	}
	e.count++
}

// RecordSuccess clears the failure counter for the request IP.
func (l *Limiter) RecordSuccess(r *http.Request) {
	addr := ip(r)
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.store, addr)
}

// ResetAll clears all state (for tests).
func (l *Limiter) ResetAll() {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.store = make(map[string]*entry)
}
