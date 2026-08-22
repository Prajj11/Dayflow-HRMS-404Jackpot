package ask

import "strings"
import "testing"

func TestDateQuestionMatchesAskingWhichDate(t *testing.T) {
	for _, q := range []string{
		"what day is it?",
		"what date is it?",
		"what is the date today",
		"whats today's date",
		"which date is this",
		"what is the selected date",
	} {
		if !dateQuestion.MatchString(strings.ToLower(q)) {
			t.Errorf("did not match %q", q)
		}
	}
}

func TestDateQuestionLeavesDataQuestionsAlone(t *testing.T) {
	for _, q := range []string{
		"whats the busiest day of the week",
		"which day had the most entries",
		"what day did Ansar come in",
		"how many people came in today",
		"what was the peak hour",
		"tell me about tuesday",
	} {
		if dateQuestion.MatchString(strings.ToLower(q)) {
			t.Errorf("wrongly captured %q", q)
		}
	}
}
