package ask

import "testing"

func TestValidateSQLAcceptsAggregateSelect(t *testing.T) {
	got, err := validateSQL("select user_id, count(*) from gatepoint_events_anon where day='2025-05-06' group by user_id limit 10")
	if err != nil {
		t.Fatalf("rejected a valid query: %v", err)
	}
	if got == "" {
		t.Fatal("empty query returned")
	}
}

func TestValidateSQLStripsMarkdownFence(t *testing.T) {
	got, err := validateSQL("```sql\nselect count(*) from gatepoint_events_anon limit 1\n```")
	if err != nil {
		t.Fatalf("rejected fenced query: %v", err)
	}
	if got[0] != 's' {
		t.Fatalf("fence not stripped: %q", got)
	}
}

func TestValidateSQLAddsLimitWhenMissing(t *testing.T) {
	got, err := validateSQL("select count(*) from gatepoint_events_anon")
	if err != nil {
		t.Fatal(err)
	}
	if !contains(got, "limit") {
		t.Fatalf("no limit added: %q", got)
	}
}

func TestValidateSQLRejectsWrites(t *testing.T) {
	for _, q := range []string{
		"delete from gatepoint_events_anon",
		"select 1 from gatepoint_events_anon; drop table gatepoint_events",
		"update gatepoint_events_anon set user_id=1",
		"insert into gatepoint_events_anon values (1)",
	} {
		if _, err := validateSQL(q); err == nil {
			t.Fatalf("accepted a write statement: %q", q)
		}
	}
}

func TestValidateSQLRejectsBaseTableWithPII(t *testing.T) {
	if _, err := validateSQL("select user_name from gatepoint_events limit 5"); err == nil {
		t.Fatal("accepted a query against the PII-bearing base table")
	}
	if _, err := validateSQL("select user_id, user_name from gatepoint_events_anon limit 5"); err == nil {
		t.Fatal("accepted a query naming a PII column")
	}
}

func TestValidateSQLRejectsSystemCatalogSnooping(t *testing.T) {
	for _, q := range []string{
		"select * from information_schema.columns limit 5",
		"select * from pg_catalog.pg_tables limit 5",
	} {
		if _, err := validateSQL(q); err == nil {
			t.Fatalf("accepted catalog snooping: %q", q)
		}
	}
}

func TestValidateSQLRejectsCommentEvasion(t *testing.T) {
	if _, err := validateSQL("select count(*) from gatepoint_events_anon -- drop table x"); err == nil {
		t.Fatal("accepted a query containing a comment")
	}
}

func TestValidateSQLRequiresAnonView(t *testing.T) {
	if _, err := validateSQL("select 1"); err == nil {
		t.Fatal("accepted a query that does not touch the anon view")
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

func TestEntityTokenMatchesCaseVariants(t *testing.T) {
	for _, s := range []string{"user:16456", "User:16456", "USER: 16456", "door:771", "Door:771"} {
		if !entityToken.MatchString(s) {
			t.Fatalf("token not recognised, would leak an unresolved id: %q", s)
		}
	}
}
