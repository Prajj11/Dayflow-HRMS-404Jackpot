package ask

import "testing"

func rows13() *SQLResult {
	// 13 buckets summing to 217 — the case where the model reported 216
	counts := []int64{6, 104, 352, 299, 177, 154, 217, 160, 192, 25, 52, 21, 18}
	r := &SQLResult{Columns: []string{"hour", "entries"}}
	for i, c := range counts {
		r.Rows = append(r.Rows, []any{int64(i + 8), c})
	}
	r.Rows = nil
	r.Columns = []string{"door_id", "entries"}
	for i, c := range counts {
		r.Rows = append(r.Rows, []any{int64(100 + i), c})
	}
	return r
}

func TestRejectsSumThatIsOffByOne(t *testing.T) {
	res := rows13() // column sums to 1777
	if _, ok := numbersDerivable("There were 1776 entries in total.", res); ok {
		t.Fatal("accepted a total that is one short of the real sum")
	}
	if _, ok := numbersDerivable("There were 1777 entries in total.", res); !ok {
		t.Fatal("rejected the correct sum")
	}
}

func TestAcceptsValuesAndDerivations(t *testing.T) {
	res := &SQLResult{
		Columns: []string{"access_type", "n"},
		Rows:    [][]any{{"qr", int64(589)}, {"card", int64(1149)}},
	}
	cases := []string{
		"QR accounted for 589 of 1738 (34%).", // sum and percentage
		"Card led with 1149.",                 // raw cell
		"The gap was 560.",                    // difference
		"The average was 869.",                // mean, rounded
	}
	for _, c := range cases {
		if tok, ok := numbersDerivable(c, res); !ok {
			t.Errorf("rejected %q on figure %q", c, tok)
		}
	}
}

func TestRejectsInventedFigure(t *testing.T) {
	res := &SQLResult{
		Columns: []string{"user_id", "n"},
		Rows:    [][]any{{int64(16456), int64(603)}},
	}
	if tok, ok := numbersDerivable("user:16456 badged in 603 times, up from 412 last week.", res); ok {
		t.Fatalf("accepted an invented figure (token %q)", tok)
	}
}

func TestIgnoresIdsAndTimestamps(t *testing.T) {
	res := &SQLResult{
		Columns: []string{"user_id", "first_seen"},
		Rows:    [][]any{{int64(16456), "2025-05-06 11:30:26"}},
	}
	if tok, ok := numbersDerivable("user:16456 arrived at 2025-05-06 11:30:26.", res); !ok {
		t.Fatalf("rejected a quoted timestamp on token %q", tok)
	}
}

func TestEmptyRowsAllowOnlyZero(t *testing.T) {
	res := &SQLResult{Columns: []string{"n"}}
	if _, ok := numbersDerivable("There was no matching activity.", res); !ok {
		t.Fatal("rejected an answer with no figures at all")
	}
	if _, ok := numbersDerivable("There were 42 events.", res); ok {
		t.Fatal("accepted a figure with no rows to support it")
	}
}
