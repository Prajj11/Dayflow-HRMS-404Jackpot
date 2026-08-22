package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testJWTSecret = "0123456789abcdef0123456789abcdef"

func TestIssueAndParseToken(t *testing.T) {
	t.Setenv("JWT_SECRET", testJWTSecret)
	token, err := issueToken(42, "employee")
	if err != nil {
		t.Fatal(err)
	}
	c, err := parseToken(token)
	if err != nil {
		t.Fatal(err)
	}
	if c.UserID != 42 || c.Role != "employee" || c.Subject != "42" {
		t.Fatalf("unexpected claims: %#v", c)
	}
	if c.ExpiresAt == nil || time.Until(c.ExpiresAt.Time) <= 0 {
		t.Fatal("token must have a future expiry")
	}
}

func TestIssueTokenRejectsWeakSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "too-short")
	if _, err := issueToken(42, "employee"); err == nil {
		t.Fatal("expected weak secret to be rejected")
	}
}

func TestParseTokenRejectsExpiredToken(t *testing.T) {
	t.Setenv("JWT_SECRET", testJWTSecret)
	now := time.Now().UTC()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{
		UserID: 42,
		Role:   "employee",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Subject:   "42",
			Audience:  jwt.ClaimStrings{jwtAudience},
			IssuedAt:  jwt.NewNumericDate(now.Add(-time.Hour)),
			ExpiresAt: jwt.NewNumericDate(now.Add(-time.Minute)),
		},
	})
	signed, err := token.SignedString([]byte(testJWTSecret))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := parseToken(signed); err == nil {
		t.Fatal("expected expired token to be rejected")
	}
}

func TestParseTokenRejectsWrongAlgorithm(t *testing.T) {
	t.Setenv("JWT_SECRET", testJWTSecret)
	token := jwt.NewWithClaims(jwt.SigningMethodNone, claims{
		UserID: 42,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Subject:   "42",
			Audience:  jwt.ClaimStrings{jwtAudience},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
		},
	})
	signed, err := token.SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := parseToken(signed); err == nil {
		t.Fatal("expected an unsigned token to be rejected")
	}
}

func TestAuthCookieSecurityAttributesSecure(t *testing.T) {
	// Secure (prod-like) contexts must use SameSite=None — the frontend and
	// backend live on different sites, so SameSite=Lax would never be sent
	// on cross-site fetch() calls, breaking auth right after signin.
	t.Setenv("COOKIE_SECURE", "true")
	w := httptest.NewRecorder()
	setAuthCookie(w, "signed-token")
	res := w.Result()
	cookies := res.Cookies()
	if len(cookies) != 1 {
		t.Fatalf("got %d cookies, want 1", len(cookies))
	}
	c := cookies[0]
	if c.Name != authCookieName || !c.HttpOnly || !c.Secure || c.SameSite != http.SameSiteNoneMode || c.Path != "/" {
		t.Fatalf("cookie is missing security attributes: %#v", c)
	}
}

func TestAuthCookieSecurityAttributesInsecure(t *testing.T) {
	// Local HTTP dev: SameSite=None requires Secure, which HTTP can't set,
	// but frontend/backend are same-site (localhost) there anyway, so Lax
	// still works.
	t.Setenv("COOKIE_SECURE", "false")
	w := httptest.NewRecorder()
	setAuthCookie(w, "signed-token")
	c := w.Result().Cookies()[0]
	if c.Secure || c.SameSite != http.SameSiteLaxMode {
		t.Fatalf("unexpected cookie attributes for insecure context: %#v", c)
	}
}

func TestInternalServiceTokenRequiresExactMatch(t *testing.T) {
	t.Setenv("MCP_INTERNAL_TOKEN", "correct-horse-battery-staple")

	req := httptest.NewRequest(http.MethodGet, "/api/employees", nil)
	req.Header.Set("X-Internal-Token", "correct-horse-battery-staple")
	if !internalServiceToken(req) {
		t.Fatal("expected matching internal token to be accepted")
	}

	req = httptest.NewRequest(http.MethodGet, "/api/employees", nil)
	req.Header.Set("X-Internal-Token", "wrong-token")
	if internalServiceToken(req) {
		t.Fatal("expected mismatched internal token to be rejected")
	}

	req = httptest.NewRequest(http.MethodGet, "/api/employees", nil)
	if internalServiceToken(req) {
		t.Fatal("expected missing internal token header to be rejected")
	}
}

func TestInternalServiceTokenDisabledWhenUnset(t *testing.T) {
	t.Setenv("MCP_INTERNAL_TOKEN", "")
	req := httptest.NewRequest(http.MethodGet, "/api/employees", nil)
	req.Header.Set("X-Internal-Token", "")
	if internalServiceToken(req) {
		t.Fatal("an empty MCP_INTERNAL_TOKEN must never authenticate a request, even with an empty header")
	}
}

func TestRequireAuthRejectsMissingToken(t *testing.T) {
	t.Setenv("JWT_SECRET", testJWTSecret)
	t.Setenv("MCP_INTERNAL_TOKEN", "")
	called := false
	handler := requireAuth(func(http.ResponseWriter, *http.Request) { called = true })
	req := httptest.NewRequest(http.MethodGet, "/api/profile/me", nil)
	w := httptest.NewRecorder()
	handler(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("got status %d, want %d", w.Code, http.StatusUnauthorized)
	}
	if called {
		t.Fatal("unauthenticated request reached protected handler")
	}
}

func TestRequireAuthAcceptsInternalServiceToken(t *testing.T) {
	t.Setenv("MCP_INTERNAL_TOKEN", "shared-secret")
	var gotRole string
	var gotUserID int
	handler := requireAuth(func(w http.ResponseWriter, r *http.Request) {
		gotRole = userRole(r)
		gotUserID = userID(r)
	})
	req := httptest.NewRequest(http.MethodGet, "/api/employees", nil)
	req.Header.Set("X-Internal-Token", "shared-secret")
	w := httptest.NewRecorder()
	handler(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", w.Code, http.StatusOK)
	}
	if gotRole != "admin" {
		t.Fatalf("internal service token should grant admin role, got %q", gotRole)
	}
	if gotUserID != 0 {
		t.Fatalf("internal service token should carry the service user id 0, got %d", gotUserID)
	}
}

// fakeSessionStore satisfies SessionStore for tests that need requireAuth's
// session-lookup to succeed without a real Redis instance.
type fakeSessionStore struct {
	sessions map[string]*Session
}

func newFakeSessionStore() *fakeSessionStore {
	return &fakeSessionStore{sessions: map[string]*Session{}}
}

func (f *fakeSessionStore) put(id string, userID int, role string) {
	f.sessions[id] = &Session{ID: id, UserID: userID, Role: role, ExpiresAt: time.Now().Add(time.Hour)}
}

func (f *fakeSessionStore) Create(context.Context, int, string, string) (*Session, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeSessionStore) Authenticate(_ context.Context, sessionID string) (*Session, error) {
	s, ok := f.sessions[sessionID]
	if !ok {
		return nil, fmt.Errorf("not found")
	}
	return s, nil
}
func (f *fakeSessionStore) Revoke(context.Context, string) error       { return nil }
func (f *fakeSessionStore) RevokeAll(context.Context, int) error       { return nil }
func (f *fakeSessionStore) List(context.Context, int, string) ([]SessionView, error) {
	return nil, nil
}

func TestRequireAdminRejectsEmployeeRole(t *testing.T) {
	t.Setenv("JWT_SECRET", testJWTSecret)
	t.Setenv("MCP_INTERNAL_TOKEN", "")
	store := newFakeSessionStore()
	store.put("sess-employee", 1, "employee")
	sessions = store
	defer func() { sessions = nil }()

	token, err := issueToken(1, "employee", "sess-employee")
	if err != nil {
		t.Fatal(err)
	}
	called := false
	handler := requireAdmin(func(http.ResponseWriter, *http.Request) { called = true })
	req := httptest.NewRequest(http.MethodGet, "/api/employees", nil)
	req.AddCookie(&http.Cookie{Name: authCookieName, Value: token})
	w := httptest.NewRecorder()
	handler(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("got status %d, want %d", w.Code, http.StatusForbidden)
	}
	if called {
		t.Fatal("employee-role request reached admin-only handler")
	}
}

func TestRequireAdminAcceptsAdminRole(t *testing.T) {
	t.Setenv("JWT_SECRET", testJWTSecret)
	t.Setenv("MCP_INTERNAL_TOKEN", "")
	store := newFakeSessionStore()
	store.put("sess-admin", 1, "admin")
	sessions = store
	defer func() { sessions = nil }()

	token, err := issueToken(1, "admin", "sess-admin")
	if err != nil {
		t.Fatal(err)
	}
	called := false
	handler := requireAdmin(func(http.ResponseWriter, *http.Request) { called = true })
	req := httptest.NewRequest(http.MethodGet, "/api/employees", nil)
	req.AddCookie(&http.Cookie{Name: authCookieName, Value: token})
	w := httptest.NewRecorder()
	handler(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", w.Code, http.StatusOK)
	}
	if !called {
		t.Fatal("admin-role request should reach the handler")
	}
}

func TestCORSRejectsCrossOriginStateChange(t *testing.T) {
	t.Setenv("FRONTEND_ORIGIN", "https://dayflow.example")
	called := false
	handler := corsMiddleware(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		called = true
	}))
	req := httptest.NewRequest(http.MethodPost, "/api/leave", nil)
	req.Header.Set("Origin", "https://attacker.example")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("got status %d, want %d", w.Code, http.StatusForbidden)
	}
	if called {
		t.Fatal("cross-origin request reached protected handler")
	}
}
