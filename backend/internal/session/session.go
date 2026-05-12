package session

import (
	"crypto/sha256"
	"net/http"

	"github.com/gorilla/securecookie"
)

const cookieName = "gce_session"

// Data holds the session payload stored in the signed cookie.
type Data struct {
	User      string `json:"u,omitempty"`
	CSRFToken string `json:"c,omitempty"`
}

// Manager signs and verifies session cookies.
type Manager struct {
	sc     *securecookie.SecureCookie
	secure bool
}

func NewManager(secret string, secure bool) *Manager {
	// Derive a fixed-length key from the secret.
	h := sha256.Sum256([]byte(secret))
	sc := securecookie.New(h[:], h[:16]) // hash key (32B) + AES-128 enc key (16B)
	return &Manager{sc: sc, secure: secure}
}

// Get reads and decodes the session cookie. Returns empty Data on any error.
func (m *Manager) Get(r *http.Request) *Data {
	cookie, err := r.Cookie(cookieName)
	if err != nil {
		return &Data{}
	}
	var d Data
	if err := m.sc.Decode(cookieName, cookie.Value, &d); err != nil {
		return &Data{}
	}
	return &d
}

// Save encodes and writes the session cookie.
func (m *Manager) Save(w http.ResponseWriter, d *Data) error {
	encoded, err := m.sc.Encode(cookieName, d)
	if err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    encoded,
		HttpOnly: true,
		Secure:   m.secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   86400,
		Path:     "/",
	})
	return nil
}

// Clear removes the session cookie.
func (m *Manager) Clear(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:   cookieName,
		Value:  "",
		MaxAge: -1,
		Path:   "/",
	})
}
