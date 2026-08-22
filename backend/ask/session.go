package ask

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

// A conversation is kept server-side because its turns must stay in id form:
// the answers the user reads have names substituted in, and sending those back
// as history would carry names across the inference boundary. Only the id-form
// text is stored, and names are re-applied on the way out of every turn.
type Turn struct {
	Question string // as asked, with any names already rewritten to ids
	SQL      string
	Answer   string // id form, before names are substituted
}

const (
	sessionTurns = 6
	sessionTTL   = 30 * time.Minute
)

type conversation struct {
	turns []Turn
	seen  time.Time
}

type sessionStore struct {
	mu sync.Mutex
	m  map[string]*conversation
}

var sessions = &sessionStore{m: map[string]*conversation{}}

func newSessionID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// History returns the recent turns for id, and the id to use going forward.
// An unknown or expired id yields a fresh conversation rather than an error,
// so a redeploy degrades to a first turn instead of a failure.
func (s *sessionStore) History(id string) ([]Turn, string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.evictLocked()

	c, ok := s.m[id]
	if !ok || id == "" {
		id = newSessionID()
		s.m[id] = &conversation{seen: time.Now()}
		return nil, id
	}
	c.seen = time.Now()
	return c.turns, id
}

func (s *sessionStore) Append(id string, t Turn) {
	s.mu.Lock()
	defer s.mu.Unlock()

	c, ok := s.m[id]
	if !ok {
		c = &conversation{}
		s.m[id] = c
	}
	c.turns = append(c.turns, t)
	if len(c.turns) > sessionTurns {
		c.turns = c.turns[len(c.turns)-sessionTurns:]
	}
	c.seen = time.Now()
}

func (s *sessionStore) evictLocked() {
	for id, c := range s.m {
		if time.Since(c.seen) > sessionTTL {
			delete(s.m, id)
		}
	}
}
