package ask

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"dayflow/backend/identity"
)

type ToolSelector interface {
	SelectTool(ctx context.Context, question string, tools []ToolSchema) (*ToolCall, error)
}

type ToolSchema struct {
	Name        string
	Description string
	Params      []ParamSchema
}

type ParamSchema struct {
	Name     string
	Type     string // "string" | "integer" | "number"
	Required bool
}

type ToolCall struct {
	Tool   string
	Params map[string]string
}

type Request struct {
	Question  string `json:"question"`
	Date      string `json:"date,omitempty"`       // YYYY-MM-DD from calendar selection
	SessionID string `json:"session_id,omitempty"` // ties a follow-up to earlier turns
}

type Response struct {
	Answer       string   `json:"answer,omitempty"`
	Disambiguate []string `json:"disambiguate,omitempty"`
	SessionID    string   `json:"session_id,omitempty"`
	FollowUp     bool     `json:"follow_up,omitempty"` // answered with earlier turns in scope
}

var allTools = []ToolSchema{
	{
		Name:        "user_entries",
		Description: "MUST use this when the question contains 'user <number>' (e.g. 'user 16426'). Returns how many times that specific user badged in.",
		Params: []ParamSchema{
			{Name: "org_user_id", Type: "integer", Required: true},
			{Name: "start", Type: "string", Required: true},
			{Name: "end", Type: "string", Required: true},
		},
	},
	{
		Name:        "org_summary",
		Description: "Overall org stats: total entries, active user count, peak hour, door count, silent doors. Use for any general question about activity, totals, doors, or users that is not about a specific person.",
		Params: []ParamSchema{
			{Name: "start", Type: "string", Required: true},
			{Name: "end", Type: "string", Required: true},
		},
	},
	{
		Name:        "top_users",
		Description: "Ranked list of most active users by entry count. Use for 'who clocked in most', 'top N users', 'most active employees'.",
		Params: []ParamSchema{
			{Name: "start", Type: "string", Required: true},
			{Name: "end", Type: "string", Required: true},
			{Name: "limit", Type: "integer", Required: false},
		},
	},
	{
		Name:        "hourly_breakdown",
		Description: "Entry counts by hour of day. Use ONLY when asked about a specific hour, e.g. 'at 3pm', 'between 9am and 10am'.",
		Params: []ParamSchema{
			{Name: "start", Type: "string", Required: true},
			{Name: "end", Type: "string", Required: true},
		},
	},
}

var idPattern = regexp.MustCompile(`\b\d{5,}\b`)

// dateQuestion matches a question about which date is being shown. The "is it"
// style anchor keeps it away from questions that rank days, such as
// "what was the busiest day of the week".
var dateQuestion = regexp.MustCompile(
	`(?i)((what|which)\b[^?]*\b(date|day)\b[^?]*\b(is it|is this|is today|is that)\b)` +
		`|((what|which)\b[^?]*\b(date|day)\s+(today|now)\b)` +
		`|\b(today'?s? date|current date|selected date)\b`)

// wantsDigest matches only an explicit request for a broad overview.
func wantsDigest(q string) bool {
	for _, kw := range []string{"digest", "overview", "summary", "summarise", "summarize", "brief me", "how was the day", "how was the week"} {
		if strings.Contains(q, kw) {
			return true
		}
	}
	return false
}

type Handler struct {
	pool    *pgxpool.Pool
	model   ToolSelector
	apiBase string
}

func NewHandler(pool *pgxpool.Pool, model ToolSelector, apiBase string, auditPath string) (*Handler, error) {
	if err := initAudit(auditPath); err != nil {
		return nil, fmt.Errorf("audit init: %w", err)
	}
	return &Handler{pool: pool, model: model, apiBase: apiBase}, nil
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"answer":"bad request"}`, http.StatusBadRequest)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
	defer cancel()
	resp, err := h.handle(ctx, req.Question, req.Date, req.SessionID)
	if err != nil {
		log.Printf("ask: handle error: %v", err)
		json.NewEncoder(w).Encode(Response{Answer: "Couldn't process that question."})
		return
	}
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) handle(ctx context.Context, question, dateHint, sessionID string) (*Response, error) {
	loc, _ := time.LoadLocation("Asia/Kolkata")
	history, sid := sessions.History(sessionID)

	// anchor: use calendar-selected date if provided, else latest event in DB
	var anchorIST time.Time
	if dateHint != "" {
		if t, err := time.ParseInLocation("2006-01-02", dateHint, loc); err == nil {
			anchorIST = t
		}
	}
	if anchorIST.IsZero() {
		var latestAt time.Time
		h.pool.QueryRow(ctx, `select max(accessed_at) from gatepoint_events where event_type='authorised_access'`).Scan(&latestAt)
		if latestAt.IsZero() {
			latestAt = time.Now()
		}
		anchorIST = latestAt.In(loc)
	}

	// The selected date is known here and is not in the data, so asking the
	// analyst for it only invites a guess at the real-world date.
	ql := strings.ToLower(question)
	if dateQuestion.MatchString(ql) {
		return &Response{Answer: fmt.Sprintf("The selected date is %s.", anchorIST.Format("Monday, January 2, 2006")), SessionID: sid}, nil
	}

	res, err := identity.Load(ctx, h.pool)
	if err != nil {
		log.Printf("ask: identity.Load: %v", err)
		return nil, err
	}
	log.Printf("ask: identity loaded %d users", len(res.FindUsers("")))

	rewritten, idMap, _, disambig := resolveEntities(question, res)
	log.Printf("ask: rewritten=%q idMap=%v", rewritten, idMap)
	if disambig != nil {
		writeAudit(auditEntry{AskedAt: time.Now(), Question: question, Answered: false})
		return &Response{Disambiguate: disambig, SessionID: sid}, nil
	}

	todayStr := anchorIST.Format("2006-01-02")
	weekStartStr := anchorIST.AddDate(0, 0, -6).Format("2006-01-02")

	// An explicit request for an overview gets the full digest; everything else
	// goes to the analyst, which composes a query specific to the question.
	if wantsDigest(ql) {
		start := todayStr
		if strings.Contains(ql, "week") {
			start = weekStartStr
		}
		if bundle, berr := BuildFactBundle(ctx, h.pool, start, todayStr); berr == nil {
			text, source := DigestText(ctx, bundle, res)
			log.Printf("ask: digest served (%s)", source)
			writeAudit(auditEntry{AskedAt: time.Now(), Question: question, ToolCalled: "digest", Answered: true})
			return &Response{Answer: text, SessionID: sid}, nil
		} else {
			log.Printf("ask: digest bundle error: %v", berr)
		}
	}

	if draft, sqlRes, aerr := h.Analyse(ctx, rewritten, todayStr, history); aerr == nil {
		log.Printf("ask: analyst sql=%q rows=%d", sqlRes.SQL, len(sqlRes.Rows))
		var resolvedIDs []int64
		for id := range idMap {
			resolvedIDs = append(resolvedIDs, id)
		}
		writeAudit(auditEntry{
			AskedAt: time.Now(), Question: question,
			ResolvedIDs: resolvedIDs, ToolCalled: "analyst", SQL: sqlRes.SQL, Answered: true,
		})
		// only the id-form draft is stored; names are applied on the way out so
		// they never travel back across the inference boundary as history
		sessions.Append(sid, Turn{Question: rewritten, SQL: sqlRes.SQL, Answer: draft})
		return &Response{
			Answer:    resolveEntityTokens(draft, res),
			SessionID: sid,
			FollowUp:  len(history) > 0,
		}, nil
	} else {
		log.Printf("ask: analyst failed, falling back to tools: %v", aerr)
	}

	prompt := fmt.Sprintf(
		"Context: today=%s, week_start=%s, week_end=%s (YYYY-MM-DD, IST).\n"+
			"Rules: for 'today'/'this day' use start=%s end=%s. For 'this week' use start=%s end=%s.\n"+
			"Use these exact dates. Do NOT use any other dates.\n\nQuestion: %s",
		todayStr, weekStartStr, todayStr,
		todayStr, todayStr,
		weekStartStr, todayStr,
		rewritten,
	)

	// if exactly one user was resolved, force user_entries — model reliably misroutes this
	// detect today vs week from the original question
	isToday := strings.Contains(ql, "today") && !strings.Contains(ql, "week")
	var call *ToolCall
	if len(idMap) == 1 {
		for id := range idMap {
			startStr := weekStartStr
			if isToday {
				startStr = todayStr
			}
			call = &ToolCall{
				Tool: "user_entries",
				Params: map[string]string{
					"org_user_id": fmt.Sprint(id),
					"start":       startStr,
					"end":         todayStr,
				},
			}
		}
		log.Printf("ask: forced user_entries isToday=%v", isToday)
	}

	if call == nil {
		modelCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()
		var merr error
		call, merr = h.model.SelectTool(modelCtx, prompt, allTools)
		if merr != nil {
			err = merr
		}
	}
	if err != nil || call == nil {
		log.Printf("ask: model error: %v", err)
		writeAudit(auditEntry{AskedAt: time.Now(), Question: question, Answered: false})
		return &Response{Answer: "Couldn't determine what you're asking. Try rephrasing.", SessionID: sid}, nil
	}
	call.Tool = normalizeToolName(call.Tool)
	log.Printf("ask: tool=%s params=%v", call.Tool, call.Params)

	result, err := h.callAPI(ctx, call)
	if err != nil {
		log.Printf("ask: api error: %v", err)
		writeAudit(auditEntry{AskedAt: time.Now(), Question: question, ToolCalled: call.Tool, Answered: false})
		return &Response{Answer: "Couldn't fetch the data right now.", SessionID: sid}, nil
	}

	answer := phraseResult(call.Tool, result, idMap, res)
	answer = stripHallucinatedIDs(answer, idMap)
	if strings.TrimSpace(answer) == "" {
		writeAudit(auditEntry{AskedAt: time.Now(), Question: question, ToolCalled: call.Tool, Answered: false})
		return &Response{Answer: "I couldn't answer that from the access data. Try asking about entries, doors, people, times of day, or access methods.", SessionID: sid}, nil
	}

	var resolvedIDs []int64
	for id := range idMap {
		resolvedIDs = append(resolvedIDs, id)
	}
	writeAudit(auditEntry{
		AskedAt: time.Now(), Question: question,
		ResolvedIDs: resolvedIDs, ToolCalled: call.Tool, Answered: true,
	})
	return &Response{Answer: answer, SessionID: sid}, nil
}

func (h *Handler) callAPI(ctx context.Context, call *ToolCall) (map[string]any, error) {
	toolToEndpoint := map[string]string{
		"user_entries":      "/api/q/user-entries",
		"get_user_entries":  "/api/q/user-entries",
		"org_summary":       "/api/q/org-summary",
		"get_org_summary":   "/api/q/org-summary",
		"top_users":         "/api/q/top-users",
		"get_top_users":     "/api/q/top-users",
		"hourly_breakdown":  "/api/q/hourly-breakdown",
		"get_door_activity": "/api/q/door-activity",
		"get_user_list":     "/api/q/user-list",
		"get_door_list":     "/api/q/door-list",
		"get_top_doors":     "/api/q/top-doors",
	}
	endpoint, ok := toolToEndpoint[call.Tool]
	if !ok {
		return nil, fmt.Errorf("unknown tool %q", call.Tool)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, h.apiBase+endpoint, nil)
	if err != nil {
		return nil, err
	}
	q := req.URL.Query()
	for k, v := range call.Params {
		if v != "" {
			q.Set(k, v)
		}
	}
	req.URL.RawQuery = q.Encode()

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%s: %s", endpoint, resp.Status)
	}
	var result map[string]any
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}

func phraseResult(tool string, data map[string]any, idMap map[int64]string, res *identity.Resolver) string {
	switch tool {
	case "user_entries", "get_user_entries":
		id := toInt64(data["org_user_id"])
		name := lookupName(id, idMap, res)
		count := toInt(data["count"])
		return fmt.Sprintf("%s clocked in %d %s.", name, count, times(count))

	case "get_door_activity":
		id := toInt64(data["access_point_id"])
		name := lookupDoorName(id, idMap, res)
		count := toInt(data["count"])
		return fmt.Sprintf("Door %s recorded %d %s.", name, count, entries(count))

	case "org_summary", "get_org_summary":
		active := toInt(data["active_users"])
		total := toInt(data["total_users"])
		entries := toInt(data["total_entries"])
		peak := toInt(data["peak_hour"])
		silent := toInt(data["silent_doors"])
		totalDoors := toInt(data["total_doors"])
		return fmt.Sprintf("%d of %d employees badged in, %d total entries. Peak hour was %d:00. %d of %d doors saw no activity.",
			active, total, entries, peak, silent, totalDoors)

	case "hourly_breakdown":
		buckets, _ := data["buckets"].([]any)
		if len(buckets) == 0 {
			return "No activity in that period."
		}
		peak, peakHour := 0, 0
		for _, b := range buckets {
			bm := b.(map[string]any)
			if c := toInt(bm["count"]); c > peak {
				peak = c
				peakHour = toInt(bm["hour"])
			}
		}
		return fmt.Sprintf("Peak activity was at %d:00 with %d entries.", peakHour, peak)

	case "top_users", "get_top_users":
		items, _ := data["items"].([]any)
		if len(items) == 0 {
			return "No data."
		}
		var parts []string
		for i, item := range items {
			if i >= 5 {
				break
			}
			m := item.(map[string]any)
			id := toInt64(m["org_user_id"])
			parts = append(parts, fmt.Sprintf("%s (%d)", lookupName(id, idMap, res), toInt(m["count"])))
		}
		return "Most active users: " + strings.Join(parts, ", ") + "."

	case "get_top_doors":
		items, _ := data["items"].([]any)
		if len(items) == 0 {
			return "No data."
		}
		var parts []string
		for i, item := range items {
			if i >= 5 {
				break
			}
			m := item.(map[string]any)
			parts = append(parts, fmt.Sprintf("%v (%d)", m["serial_name"], toInt(m["count"])))
		}
		return "Most active doors: " + strings.Join(parts, ", ") + "."

	case "get_user_list":
		items, _ := data["items"].([]any)
		return fmt.Sprintf("%d users registered.", len(items))

	case "get_door_list":
		items, _ := data["items"].([]any)
		return fmt.Sprintf("%d doors registered.", len(items))
	}

	return fmt.Sprintf("%v", data)
}

func resolveEntities(question string, res *identity.Resolver) (string, map[int64]string, []string, []string) {
	rewritten := question
	idMap := map[int64]string{}
	var names []string
	words := strings.Fields(question)
	consumed := map[int]bool{}

	for length := 3; length >= 1; length-- {
		for i := range words {
			if i+length > len(words) {
				continue
			}
			skip := false
			for j := i; j < i+length; j++ {
				if consumed[j] {
					skip = true
					break
				}
			}
			if skip {
				continue
			}
			phrase := strings.Trim(strings.Join(words[i:i+length], " "), ".,?!")
			if len(phrase) < 3 {
				continue
			}
			users := res.FindUsers(phrase)
			if len(users) == 1 {
				u := users[0]
				idMap[u.OrgUserID] = u.Name
				names = append(names, u.Name)
				rewritten = strings.ReplaceAll(rewritten, phrase, fmt.Sprintf("user %d", u.OrgUserID))
				for j := i; j < i+length; j++ {
					consumed[j] = true
				}
				continue
			}
			if len(users) > 1 {
				var full []string
				for _, u := range users {
					full = append(full, u.Name)
				}
				return "", nil, nil, full
			}
			doors := res.FindDoors(phrase)
			if len(doors) == 1 {
				d := doors[0]
				idMap[d.AccessPointID] = d.Name
				rewritten = strings.ReplaceAll(rewritten, phrase, fmt.Sprintf("door %d", d.AccessPointID))
				for j := i; j < i+length; j++ {
					consumed[j] = true
				}
				continue
			}
			// an ambiguous door used to be dropped silently, which surfaced as
			// "couldn't determine" rather than a question the user could answer
			if len(doors) > 1 {
				var full []string
				for _, d := range doors {
					full = append(full, d.Name)
				}
				return "", nil, nil, full
			}
		}
	}
	return rewritten, idMap, names, nil
}

func stripHallucinatedIDs(s string, idMap map[int64]string) string {
	return idPattern.ReplaceAllStringFunc(s, func(m string) string {
		id, _ := strconv.ParseInt(m, 10, 64)
		if _, ok := idMap[id]; ok {
			return m
		}
		return "[redacted]"
	})
}

func lookupName(id int64, idMap map[int64]string, res *identity.Resolver) string {
	if n, ok := idMap[id]; ok {
		return n
	}
	return res.UserName(id)
}

func lookupDoorName(id int64, idMap map[int64]string, res *identity.Resolver) string {
	if n, ok := idMap[id]; ok {
		return n
	}
	return res.DoorName(id)
}

var toolAliases = map[string]string{
	"get_hourly_breakdown": "hourly_breakdown",
	"user_entries":         "get_user_entries",
	"door_activity":        "get_door_activity",
	"org_summary":          "get_org_summary",
	"user_list":            "get_user_list",
	"door_list":            "get_door_list",
	"top_users":            "get_top_users",
	"top_doors":            "get_top_doors",
}

func normalizeToolName(name string) string {
	if canonical, ok := toolAliases[name]; ok {
		return canonical
	}
	return name
}

func times(n int) string {
	if n == 1 {
		return "time"
	}
	return "times"
}

func entries(n int) string {
	if n == 1 {
		return "entry"
	}
	return "entries"
}

func toInt(v any) int {
	switch x := v.(type) {
	case float64:
		return int(x)
	case int:
		return x
	case int64:
		return int(x)
	}
	return 0
}

func toInt64(v any) int64 {
	switch x := v.(type) {
	case float64:
		return int64(x)
	case int64:
		return x
	case int:
		return int64(x)
	}
	return 0
}
