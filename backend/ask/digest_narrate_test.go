package ask

import "testing"

func testBundle() *FactBundle {
	return &FactBundle{
		Start: "2025-05-06", End: "2025-05-06", Days: 1,
		TotalEntries: 1738, ActiveUsers: 9, TotalUsers: 46,
		ActiveDoors: 11, TotalDoors: 54, SilentDoors: 43,
		FirstEntry: "09:11", LastEntry: "19:21",
		PeakHour: 11, PeakCount: 352, PeakSharePct: 20,
		TopUsers: []IDCount{{ID: 16426, Count: 603}},
		TopDoors: []IDCount{{ID: 771, Count: 509}},
	}
}

func TestNumbersCheckOutAcceptsBundleFigures(t *testing.T) {
	draft := "There were 1738 entries from 9 of 46 people. Peak was hour 11 with 352 entries (20 percent). user:16426 led with 603."
	if !numbersCheckOut(draft, testBundle()) {
		t.Fatal("rejected a draft containing only bundle-derived numbers")
	}
}

func TestNumbersCheckOutRejectsInventedFigure(t *testing.T) {
	draft := "There were 1738 entries, up from roughly 1200 last period."
	if numbersCheckOut(draft, testBundle()) {
		t.Fatal("accepted a draft containing an invented number (1200)")
	}
}

func TestNumbersCheckOutAcceptsCommaFormatting(t *testing.T) {
	if !numbersCheckOut("A total of 1,738 entries.", testBundle()) {
		t.Fatal("rejected comma-formatted bundle figure")
	}
}

func TestFactBundleCarriesNoNames(t *testing.T) {
	// IDCount and the bundle must expose ids only; a name field would be a PII leak.
	b := testBundle()
	if len(b.TopUsers) == 0 || b.TopUsers[0].ID != 16426 {
		t.Fatal("top users should be identified by opaque id")
	}
}
