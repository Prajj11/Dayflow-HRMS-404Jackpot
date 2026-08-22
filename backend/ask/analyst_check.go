package ask

import (
	"fmt"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// The analyst is allowed to do arithmetic on the rows, so a figure in its answer
// is legitimate if it is either a value from the result set or something
// derivable from it. Anything else is invented and the answer is rejected.

var analystNumber = regexp.MustCompile(`\d[\d,]*(?:\.\d+)?`)

const numEpsilon = 0.001

// derivable collects every figure the rows can justify: the cell values
// themselves, per-column sums and averages, and the differences and percentages
// between any two of those.
func derivable(res *SQLResult) []float64 {
	var cells []float64
	sums := make([]float64, len(res.Columns))
	counts := make([]int, len(res.Columns))

	for _, row := range res.Rows {
		for i, v := range row {
			f, ok := asFloat(v)
			if !ok {
				continue
			}
			cells = append(cells, f)
			if i < len(sums) {
				sums[i] += f
				counts[i]++
			}
		}
	}

	base := append([]float64{}, cells...)
	base = append(base, float64(len(res.Rows)))
	for i, s := range sums {
		if counts[i] == 0 {
			continue
		}
		base = append(base, s, s/float64(counts[i]))
	}

	base = dedupe(base)
	out := append([]float64{}, base...)
	// pairwise derivations are quadratic, so cap the inputs; the cap is far
	// above the row counts the analyst actually narrates from
	if len(base) > 120 {
		base = base[:120]
	}
	for _, a := range base {
		for _, b := range base {
			out = append(out, a-b)
			// a ratio is only kept when it reads as a proportion; without this
			// bound the pairwise space covers nearly every integer and the
			// check stops rejecting anything
			if r := a * 100 / b; b != 0 && r >= 0 && r <= 500 {
				out = append(out, r)
			}
		}
	}
	return dedupe(out)
}

// numbersDerivable reports whether every figure in the draft comes from the rows.
func numbersDerivable(draft string, res *SQLResult) (string, bool) {
	s := entityToken.ReplaceAllString(draft, " ")

	// literal cell text — dates, times, labels — is quoted from the rows as-is,
	// so remove it before looking for numbers the model made up
	for _, lit := range cellLiterals(res) {
		s = strings.ReplaceAll(s, lit, " ")
	}

	allowed := derivable(res)
	for _, tok := range analystNumber.FindAllString(s, -1) {
		n, err := strconv.ParseFloat(strings.ReplaceAll(tok, ",", ""), 64)
		if err != nil {
			return tok, false
		}
		if !matches(n, allowed) {
			return tok, false
		}
	}
	return "", true
}

// matches accepts a figure that equals a derived value, or a rounding of one.
// A percentage stated as 34 must still pass against a computed 33.87.
func matches(n float64, allowed []float64) bool {
	for _, a := range allowed {
		if math.Abs(n-a) < numEpsilon {
			return true
		}
		for _, dp := range []float64{1, 10, 100} {
			if math.Abs(n-math.Round(a*dp)/dp) < numEpsilon {
				return true
			}
		}
		if math.Abs(n-math.Trunc(a)) < numEpsilon || math.Abs(n-math.Ceil(a)) < numEpsilon {
			return true
		}
	}
	return false
}

// cellLiterals returns the string form of every cell, longest first so that a
// longer literal is removed before a shorter one that it contains.
func cellLiterals(res *SQLResult) []string {
	seen := map[string]bool{}
	var out []string
	for _, row := range res.Rows {
		for _, v := range row {
			if v == nil {
				continue
			}
			s := strings.TrimSpace(fmt.Sprint(v))
			if len(s) < 2 || seen[s] {
				continue
			}
			// a purely numeric cell is already covered by the allowed values;
			// removing it as text would chop digits out of unrelated figures
			if _, isNum := asFloat(v); isNum {
				continue
			}
			seen[s] = true
			out = append(out, s)
		}
	}
	sort.Slice(out, func(i, j int) bool { return len(out[i]) > len(out[j]) })
	return out
}

func asFloat(v any) (float64, bool) {
	switch x := v.(type) {
	case nil:
		return 0, false
	case int:
		return float64(x), true
	case int32:
		return float64(x), true
	case int64:
		return float64(x), true
	case float32:
		return float64(x), true
	case float64:
		return x, true
	case bool:
		return 0, false
	case string:
		f, err := strconv.ParseFloat(x, 64)
		return f, err == nil
	}
	f, err := strconv.ParseFloat(fmt.Sprint(v), 64)
	return f, err == nil
}

func dedupe(in []float64) []float64 {
	seen := map[float64]bool{}
	out := in[:0]
	for _, f := range in {
		k := math.Round(f*1000) / 1000
		if seen[k] {
			continue
		}
		seen[k] = true
		out = append(out, f)
	}
	return out
}
