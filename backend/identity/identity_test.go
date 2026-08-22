package identity

import "testing"

func TestNameMatchesRejectsOrdinaryWords(t *testing.T) {
	cases := []struct {
		name, query string
	}{
		{"Ap channel one (Deleted)", "one"},
		{"CastorAndroid", "and"},
		{"Entry + exit zeon (Deleted)", "exit"},
		{"Halo entry/exit (Deleted)", "the"},
	}
	for _, c := range cases {
		if nameMatches(c.name, c.query) {
			t.Errorf("%q matched %q — an ordinary word would be rewritten into an id", c.query, c.name)
		}
	}
}

func TestNameMatchesAcceptsRealReferences(t *testing.T) {
	cases := []struct {
		name, query string
	}{
		{"lancy", "lancy"},
		{"Sahil Dessai", "sahil dessai"},
		{"Halo entry/exit (Deleted)", "halo"},
		{"ZEON_03 + 00 (Deleted)", "zeon_03"},
		{"Ansar", "ANSAR"},
	}
	for _, c := range cases {
		if !nameMatches(c.name, c.query) {
			t.Errorf("%q did not match %q — a genuine reference would go unresolved", c.query, c.name)
		}
	}
}
