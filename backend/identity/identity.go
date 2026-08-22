package identity

import (
	"context"
	"fmt"
	"strings"
	"unicode"

	"github.com/jackc/pgx/v5/pgxpool"
)

type User struct {
	OrgUserID int64
	Name      string
}

type Door struct {
	AccessPointID int64
	Name          string
}

type Resolver struct {
	users []User
	doors []Door
}

// Load reads distinct users and doors from gatepoint_events.
func Load(ctx context.Context, pool *pgxpool.Pool) (*Resolver, error) {
	r := &Resolver{}

	urows, err := pool.Query(ctx,
		`select distinct user_id, user_name from gatepoint_events
		 where event_type='authorised_access' and user_name is not null
		   and user_id is not null`)
	if err != nil {
		return nil, err
	}
	defer urows.Close()
	seen := map[int64]bool{}
	for urows.Next() {
		var u User
		if err := urows.Scan(&u.OrgUserID, &u.Name); err != nil {
			return nil, err
		}
		if !seen[u.OrgUserID] {
			seen[u.OrgUserID] = true
			r.users = append(r.users, u)
		}
	}
	if err := urows.Err(); err != nil {
		return nil, err
	}

	drows, err := pool.Query(ctx,
		`select distinct access_point_id, access_point_name from gatepoint_events
		 where event_type='authorised_access' and access_point_name is not null
		   and access_point_id is not null`)
	if err != nil {
		return nil, err
	}
	defer drows.Close()
	dseen := map[int64]bool{}
	for drows.Next() {
		var d Door
		if err := drows.Scan(&d.AccessPointID, &d.Name); err != nil {
			return nil, err
		}
		if !dseen[d.AccessPointID] {
			dseen[d.AccessPointID] = true
			r.doors = append(r.doors, d)
		}
	}
	if err := drows.Err(); err != nil {
		return nil, err
	}

	return r, nil
}

func words(s string) []string {
	return strings.FieldsFunc(strings.ToLower(s), func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r)
	})
}

// nameMatches reports whether query is a substantial reference to name.
//
// A whole-word match alone is not enough: the word "one" matched the door
// "Ap channel one (Deleted)" and the word "and" matched "CastorAndroid", so
// ordinary English in a question got rewritten into entity ids. A partial match
// therefore has to either cover half the name or lead it, which is how people
// actually shorten a name — "halo" for "Halo entry/exit", never "one".
func nameMatches(name, query string) bool {
	q, n := words(query), words(name)
	if len(q) == 0 || len(n) == 0 {
		return false
	}
	if strings.EqualFold(strings.TrimSpace(name), strings.TrimSpace(query)) {
		return true
	}
	for i := 0; i+len(q) <= len(n); i++ {
		matched := true
		for j := range q {
			if n[i+j] != q[j] {
				matched = false
				break
			}
		}
		if !matched {
			continue
		}
		if len(q)*2 >= len(n) {
			return true
		}
		return i == 0 && len(q[0]) >= 4
	}
	return false
}

func (r *Resolver) FindUsers(query string) []User {
	var matches []User
	for _, u := range r.users {
		if nameMatches(u.Name, query) {
			matches = append(matches, u)
		}
	}
	return matches
}

func (r *Resolver) FindDoors(query string) []Door {
	var matches []Door
	for _, d := range r.doors {
		if nameMatches(d.Name, query) {
			matches = append(matches, d)
		}
	}
	return matches
}

func (r *Resolver) UserName(id int64) string {
	for _, u := range r.users {
		if u.OrgUserID == id {
			return u.Name
		}
	}
	// this export carries no names, so an id is the honest rendering
	return fmt.Sprintf("user %d", id)
}

func (r *Resolver) DoorName(id int64) string {
	for _, d := range r.doors {
		if d.AccessPointID == id {
			return d.Name
		}
	}
	return fmt.Sprintf("door %d", id)
}
