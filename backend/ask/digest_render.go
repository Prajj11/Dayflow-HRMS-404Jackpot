package ask

import (
	"fmt"
	"strings"

	"dayflow/backend/identity"
)

// RenderDigest composes the deterministic digest. Names are substituted here,
// after every number has been computed — nothing personal is ever derived from a model.
func RenderDigest(b *FactBundle, res *identity.Resolver) string {
	if b.TotalEntries == 0 {
		return fmt.Sprintf("No access activity recorded between %s and %s.", b.Start, b.End)
	}

	var sb strings.Builder
	p := func(format string, args ...any) { fmt.Fprintf(&sb, format+"\n", args...) }

	label := b.Start
	if b.Days > 1 {
		label = fmt.Sprintf("%s to %s (%d days)", b.Start, b.End, b.Days)
	}
	p("%s", label)
	p("")

	p("%s of %s employees badged in, generating %s entries across %d of %d doors.",
		comma(b.ActiveUsers), comma(b.TotalUsers), comma(b.TotalEntries), b.ActiveDoors, b.TotalDoors)
	p("")

	rhythm := "Rhythm — first badge at %s, last at %s."
	if b.Days > 1 {
		rhythm = "Rhythm — activity ran from %s to %s on a typical day."
	}
	p(rhythm+" Peak hour was %02d:00 with %s entries (%d%% of all traffic).",
		b.FirstEntry, b.LastEntry, b.PeakHour, comma(b.PeakCount), b.PeakSharePct)
	if q := quietStretch(b); q != "" {
		p("%s", q)
	}
	p("")

	p("Concentration — the busiest %d users account for %d%% of entries. Median user badged %s times; the highest badged %s.",
		min(3, len(b.TopUsers)), b.Top3SharePct, comma(b.MedianEntries), comma(b.MaxEntries))
	for i, u := range b.TopUsers {
		p("  %d. %s — %s entries (%d%%)", i+1, res.UserName(u.ID), comma(u.Count), pct(u.Count, b.TotalEntries))
	}
	p("")

	p("Doors — %d of %d recorded no activity at all.", b.SilentDoors, b.TotalDoors)
	for i, d := range b.TopDoors {
		p("  %d. %s — %s entries (%d%%)", i+1, res.DoorName(d.ID), comma(d.Count), pct(d.Count, b.TotalEntries))
	}
	p("")

	if len(b.AccessMix) > 0 {
		p("Access methods — %s.", mixLine(b.AccessMix, b.TotalEntries))
	}
	if len(b.Directions) > 1 {
		p("Direction — %s.", mixLine(b.Directions, b.TotalEntries))
	}

	if b.PrevEntries > 0 {
		p("")
		p("Versus the preceding %d day(s): entries %s (%s to %s), active users %s (%d to %d).",
			b.Days, signed(b.EntriesDeltaPct)+"%", comma(b.PrevEntries), comma(b.TotalEntries),
			signedInt(b.ActiveUsers-b.PrevActiveUsers), b.PrevActiveUsers, b.ActiveUsers)
	}

	return strings.TrimRight(sb.String(), "\n")
}

// quietStretch reports the longest run of active-window hours with no entries.
func quietStretch(b *FactBundle) string {
	if len(b.Hourly) < 2 {
		return ""
	}
	present := map[int]bool{}
	lo, hi := 23, 0
	for _, h := range b.Hourly {
		present[h.Hour] = true
		if h.Hour < lo {
			lo = h.Hour
		}
		if h.Hour > hi {
			hi = h.Hour
		}
	}
	bestStart, bestLen, curStart, curLen := -1, 0, -1, 0
	for h := lo; h <= hi; h++ {
		if present[h] {
			curStart, curLen = -1, 0
			continue
		}
		if curStart == -1 {
			curStart = h
		}
		curLen++
		if curLen > bestLen {
			bestStart, bestLen = curStart, curLen
		}
	}
	if bestLen < 2 {
		return ""
	}
	return fmt.Sprintf("Quietest stretch was %02d:00–%02d:00 with no recorded entries.", bestStart, bestStart+bestLen)
}

func mixLine(items []LabelCount, total int) string {
	var parts []string
	for i, it := range items {
		if i >= 4 {
			break
		}
		parts = append(parts, fmt.Sprintf("%s %d%%", strings.ReplaceAll(it.Label, "_", " "), pct(it.Count, total)))
	}
	return strings.Join(parts, ", ")
}

func comma(n int) string {
	s := fmt.Sprint(n)
	neg := strings.HasPrefix(s, "-")
	s = strings.TrimPrefix(s, "-")
	var out []byte
	for i, c := range []byte(s) {
		if i > 0 && (len(s)-i)%3 == 0 {
			out = append(out, ',')
		}
		out = append(out, c)
	}
	if neg {
		return "-" + string(out)
	}
	return string(out)
}

func signed(n int) string {
	if n >= 0 {
		return "+" + fmt.Sprint(n)
	}
	return fmt.Sprint(n)
}

func signedInt(n int) string { return signed(n) }
