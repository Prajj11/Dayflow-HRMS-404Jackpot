package ask

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"

	"dayflow/backend/identity"
)

const narrateSystem = `You are an access-control analytics writer. You are given a JSON fact bundle
of aggregate door-entry statistics. Write a short briefing — three paragraphs at most — for
an office admin who wants to know what happened, not to read every number back.

Be selective. Pick the few things that actually characterise the period: how concentrated
the activity is, the shape of the day, which doors dominate, whether the trend moved, and
anything that looks anomalous. Leave out figures that carry no signal. A bundle field you
do not mention is not a mistake; a paragraph that lists numbers without saying what they
mean is. Vary how you open — no stock first sentence.

HARD RULES:
1. Use ONLY numbers that appear in the fact bundle. Never estimate, round, extrapolate, or invent a number.
2. People and doors are identified ONLY by opaque ids. Refer to them as user:<id> and door:<id>, exactly.
   You do not know anyone's name. Never guess or invent a name.
3. Never name a bundle field in your prose. Say "the top three people accounted for 77 percent",
   not "the top3_users_share_pct is 77".
4. Do not add recommendations that assume facts not in the bundle.
5. Plain prose. No markdown headers, no bullet lists, no emoji.
6. Field meanings, do not mix them up: top_users are people, top_doors are physical doors,
   top3_users_share_pct describes people only. first_entry/last_entry are times of day.
   peak_hour is an hour of day in 24-hour form.`

var (
	entityToken = regexp.MustCompile(`(?i)\b(user|door):\s*(\d+)\b`)
	numberToken = regexp.MustCompile(`\d[\d,]*`)
)

// NarrateDigest asks the model to write prose from the fact bundle, then verifies
// every number it produced against that bundle. Returns ok=false if the model is
// unavailable or drifted, so the caller can fall back to the deterministic render.
func NarrateDigest(ctx context.Context, b *FactBundle, res *identity.Resolver) (string, bool) {
	key := os.Getenv("GROQ_API_KEY")
	if key == "" {
		return "", false
	}

	facts, err := json.Marshal(b)
	if err != nil {
		return "", false
	}

	payload := map[string]any{
		"model": "llama-3.3-70b-versatile",
		"messages": []map[string]string{
			{"role": "system", "content": narrateSystem},
			{"role": "user", "content": "Fact bundle:\n" + string(facts)},
		},
		"temperature": 0.2,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.groq.com/openai/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", false
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", false
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", false
	}

	var cr struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil || len(cr.Choices) == 0 {
		return "", false
	}
	draft := strings.TrimSpace(cr.Choices[0].Message.Content)
	if draft == "" {
		return "", false
	}

	if !numbersCheckOut(draft, b) {
		return "", false
	}

	// Only now, after validation, do ids become names — in Go, never in the model.
	return entityToken.ReplaceAllStringFunc(draft, func(tok string) string {
		m := entityToken.FindStringSubmatch(tok)
		id, err := strconv.ParseInt(m[2], 10, 64)
		if err != nil {
			return tok
		}
		if strings.EqualFold(m[1], "user") {
			return res.UserName(id)
		}
		return res.DoorName(id)
	}), true
}

// numbersCheckOut rejects the draft if it contains any figure not derivable from the bundle.
func numbersCheckOut(draft string, b *FactBundle) bool {
	allowed := allowedNumbers(b)
	stripped := entityToken.ReplaceAllString(draft, " ")
	for _, tok := range numberToken.FindAllString(stripped, -1) {
		n, err := strconv.Atoi(strings.ReplaceAll(tok, ",", ""))
		if err != nil {
			return false
		}
		if !allowed[n] {
			return false
		}
	}
	return true
}

func allowedNumbers(b *FactBundle) map[int]bool {
	a := map[int]bool{}
	add := func(ns ...int) {
		for _, n := range ns {
			a[n] = true
			if n < 0 {
				a[-n] = true
			}
		}
	}

	add(b.Days, b.TotalEntries, b.ActiveUsers, b.TotalUsers, b.ActiveDoors, b.TotalDoors,
		b.SilentDoors, b.PeakHour, b.PeakCount, b.PeakSharePct, b.Top3SharePct,
		b.MedianEntries, b.MaxEntries, b.PrevEntries, b.PrevActiveUsers, b.EntriesDeltaPct)

	// ordinals for ranked lists
	for i := 0; i <= len(b.TopUsers)+len(b.TopDoors)+1; i++ {
		add(i)
	}
	for _, h := range b.Hourly {
		add(h.Hour, h.Count, pct(h.Count, b.TotalEntries))
		add((h.Hour+11)%12 + 1) // 12-hour clock rendering
	}
	for _, u := range b.TopUsers {
		add(int(u.ID), u.Count, pct(u.Count, b.TotalEntries))
	}
	for _, d := range b.TopDoors {
		add(int(d.ID), d.Count, pct(d.Count, b.TotalEntries))
	}
	for _, m := range b.AccessMix {
		add(m.Count, pct(m.Count, b.TotalEntries))
	}
	for _, d := range b.Directions {
		add(d.Count, pct(d.Count, b.TotalEntries))
	}
	add(b.ActiveUsers-b.PrevActiveUsers, b.TotalEntries-b.PrevEntries)

	for _, s := range []string{b.Start, b.End, b.FirstEntry, b.LastEntry} {
		for _, tok := range numberToken.FindAllString(s, -1) {
			if n, err := strconv.Atoi(tok); err == nil {
				add(n)
			}
		}
	}
	return a
}

// DigestText produces the digest, preferring model prose but always falling back
// to the deterministic render.
func DigestText(ctx context.Context, b *FactBundle, res *identity.Resolver) (string, string) {
	if b.TotalEntries > 0 {
		if prose, ok := NarrateDigest(ctx, b, res); ok {
			return prose, "model"
		}
	}
	return RenderDigest(b, res), "deterministic"
}
