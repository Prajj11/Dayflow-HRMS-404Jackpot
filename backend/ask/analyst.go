package ask

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"dayflow/backend/identity"
)

const anonView = "gatepoint_events_anon"

// SQLResult is what an analyst query produced.
type SQLResult struct {
	SQL     string
	Columns []string
	Rows    [][]any
}

var (
	writeVerb = regexp.MustCompile(`(?is)\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|analyze|reindex|comment|call|do|merge|lock|set|reset|begin|commit|rollback|prepare|execute|listen|notify|refresh)\b`)
	baseTable = regexp.MustCompile(`(?i)\bgatepoint_events\b`)
	sneaky    = regexp.MustCompile(`(?i)(pg_|information_schema|dblink|pg_read|lo_import|lo_export|current_setting|user_name|employee_code)`)
	fenced    = regexp.MustCompile("(?s)```(?:sql)?(.*?)```")
)

// validateSQL enforces that the model produced a single read-only SELECT against
// the de-identified view. Anything else is rejected outright.
func validateSQL(q string) (string, error) {
	s := strings.TrimSpace(q)
	if m := fenced.FindStringSubmatch(s); m != nil {
		s = strings.TrimSpace(m[1])
	}
	s = strings.TrimSuffix(strings.TrimSpace(s), ";")

	if strings.Contains(s, ";") {
		return "", fmt.Errorf("multiple statements")
	}
	if strings.Contains(s, "--") || strings.Contains(s, "/*") {
		return "", fmt.Errorf("comments not allowed")
	}
	low := strings.ToLower(s)
	if !strings.HasPrefix(low, "select") && !strings.HasPrefix(low, "with") {
		return "", fmt.Errorf("not a select")
	}
	if writeVerb.MatchString(s) {
		return "", fmt.Errorf("write or control statement")
	}
	if sneaky.MatchString(s) {
		return "", fmt.Errorf("disallowed identifier")
	}
	if !strings.Contains(low, anonView) {
		return "", fmt.Errorf("must query %s", anonView)
	}
	// any reference to the base table left over once the anon view is masked out
	// means the query reaches PII-bearing columns
	if baseTable.MatchString(strings.ReplaceAll(low, anonView, "")) {
		return "", fmt.Errorf("must query %s", anonView)
	}
	if !strings.Contains(low, "limit") {
		s += " limit 200"
	}
	return s, nil
}

// runSQL executes the validated query in a read-only transaction with a hard timeout.
func runSQL(ctx context.Context, pool *pgxpool.Pool, sql string) (*SQLResult, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{AccessMode: pgx.ReadOnly})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "set local statement_timeout = 5000"); err != nil {
		return nil, err
	}

	rows, err := tx.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := &SQLResult{SQL: sql}
	for _, fd := range rows.FieldDescriptions() {
		res.Columns = append(res.Columns, string(fd.Name))
	}
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return nil, err
		}
		for i, v := range vals {
			if t, ok := v.(time.Time); ok {
				vals[i] = t.Format("2006-01-02 15:04:05")
			}
		}
		res.Rows = append(res.Rows, vals)
		if len(res.Rows) >= 200 {
			break
		}
	}
	return res, rows.Err()
}

// analystSQLPrompt composes the system prompt from a profile measured off the
// live data, so the model learns the real value domains rather than rules I wrote.
func analystSQLPrompt(profile string) string {
	return `You are a SQL analyst for an office access-control database (PostgreSQL).
Given a question, reply with ONE SQL SELECT statement that answers it. Nothing else — no prose, no markdown.

` + profile + `

- Query only gatepoint_events_anon, and add an explicit LIMIT of at most 200.
- Return an aggregated result rather than raw rows, and include the identifying
  id column (user_id or access_point_id) when the answer is about specific people or doors.
- For a percentage, return the numerator and the denominator so the figure can be checked.
- day and hour are already in IST; use them for date and time-of-day filters.
- Count only successful access events unless the question is about failures.
- hour is a whole-hour bucket, so "after 6pm" is hour >= 18 and "before 9am" is hour < 9.
- A numerator and its denominator must be counted over the same population.
- Filter only on what the question asks. A column that is often null will silently
  drop most rows if you filter on it unprompted — check the null rates above.`
}

const analystAnswerSystem = `You are an access-control analyst answering a colleague who asked you a question.
You are given their question, the SQL that was run, and the resulting rows.

Answer the question and then stop. A one-line question deserves a one-line answer.
Only add a second sentence when a row genuinely qualifies the answer — a near-tie at the
top, an unexpected zero, a figure that reads wrong without context. Never add a sentence
just to sound thorough, and never restate the same number in two different ways.

Write the way an analyst speaks: lead with the finding, put the number next to it. Do not
open with a stock phrase, do not narrate the query, do not tack on a closing summary.
If the question is a ranking, give a short list and nothing else.

Every figure must come from the rows. You may do arithmetic on them (percentages,
differences, averages) and should state the result plainly, e.g. "589 of 1738 (34%)".
Never invent, estimate, or extrapolate a number.

People and doors appear only as opaque ids. Refer to them as user:<id> and door:<id>,
exactly. You do not know any names and must never guess one.

If the rows are empty, say there was no matching activity — nothing more.
If the rows do not actually answer what was asked — the question wanted a duration and
the rows hold counts, or it named an hour and the rows are grouped by door — say what
the rows do show and that it does not answer the question. Reshaping the question into
whatever the rows happen to support is worse than admitting the gap.
Plain prose, no markdown, no code.

You may be given earlier turns of the conversation. Use them to understand what the
question refers to, and do not repeat context the person already has — if they just
asked about a door and now ask "and who used it", answer about the people. Never reuse
a figure from an earlier turn: only the rows you were given now are current.`

// Analyse answers a question by composing SQL, running it read-only, then
// narrating the rows. The answer comes back in id form; the caller substitutes
// names, so nothing carrying a name is ever available to store as history.
func (h *Handler) Analyse(ctx context.Context, question, dateHint string, history []Turn) (string, *SQLResult, error) {
	sqlSystem := analystSQLPrompt(SchemaProfile(ctx, h.pool))
	prompt := fmt.Sprintf(
		"Context: the dashboard is showing %s (IST). Filter to that date by default — the "+
			"question is about that day unless it says otherwise. The exception is a question "+
			"about what exists rather than what happened: how many doors or people there are "+
			"in total, or anything asking across all history. Those cover the whole table and "+
			"must not be filtered by day.%s\n\nQuestion: %s",
		dateHint, transcript(history), question)

	var lastErr error
	var result *SQLResult
	for attempt := 0; attempt < 3; attempt++ {
		p := prompt
		if lastErr != nil {
			p = fmt.Sprintf("%s\n\nYour previous SQL failed with: %s\nReturn corrected SQL.", prompt, lastErr)
		}
		raw, err := chat(ctx, sqlSystem, p, 0.0)
		if err != nil {
			return "", nil, err
		}
		sql, verr := validateSQL(raw)
		if verr != nil {
			lastErr = verr
			continue
		}
		result, err = runSQL(ctx, h.pool, sql)
		if err != nil {
			lastErr = err
			continue
		}
		lastErr = nil
		break
	}
	if lastErr != nil || result == nil {
		return "", nil, fmt.Errorf("could not build a working query: %w", lastErr)
	}

	payload, _ := json.Marshal(map[string]any{
		"question":     question,
		"sql":          result.SQL,
		"columns":      result.Columns,
		"rows":         result.Rows,
		"conversation": history,
	})
	// a figure the rows cannot justify is worse than no answer, so the draft is
	// checked and the model is handed the offending number back to correct
	var badNum string
	for attempt := 0; attempt < 3; attempt++ {
		in := string(payload)
		if badNum != "" {
			in = fmt.Sprintf("%s\n\nYour previous answer stated %s, which does not follow from these rows. Recompute from the rows and answer again.", in, badNum)
		}
		draft, err := chat(ctx, analystAnswerSystem, in, 0.1)
		if err != nil {
			return "", result, err
		}
		n, ok := numbersDerivable(draft, result)
		if ok {
			return draft, result, nil
		}
		badNum = n
		log.Printf("ask: analyst rejected figure %q in %q", badNum, draft)
	}
	return "", result, fmt.Errorf("answer stated %s, which the rows do not support", badNum)
}

// transcript renders prior turns for the model. The turns are already in id
// form, which is what makes it safe to send them back.
func transcript(history []Turn) string {
	if len(history) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("\n\nEarlier in this conversation:")
	for _, t := range history {
		fmt.Fprintf(&b, "\n  Q: %s\n  A: %s", t.Question, t.Answer)
	}
	b.WriteString("\n\nThe question below may depend on those turns — it can refer to " +
		"a person, door, date or filter already established without naming it again. " +
		"Resolve it against them, then answer it as a standalone question.")
	return b.String()
}

// resolveEntityTokens turns user:<id> / door:<id> into real names, in Go.
func resolveEntityTokens(s string, res *identity.Resolver) string {
	return entityToken.ReplaceAllStringFunc(s, func(tok string) string {
		m := entityToken.FindStringSubmatch(tok)
		id, err := strconv.ParseInt(m[2], 10, 64)
		if err != nil {
			return tok
		}
		if strings.EqualFold(m[1], "user") {
			return res.UserName(id)
		}
		return res.DoorName(id)
	})
}
