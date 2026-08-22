package ask

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const chatModel = "llama-3.3-70b-versatile"

// Without a deadline of its own a stalled call rides the whole request context;
// one was observed hanging for 15 minutes before failing.
var chatClient = &http.Client{Timeout: 30 * time.Second}

// chat sends a single system+user exchange to Groq and returns the text reply.
func chat(ctx context.Context, system, user string, temperature float64) (string, error) {
	key := os.Getenv("GROQ_API_KEY")
	if key == "" {
		return "", fmt.Errorf("no GROQ_API_KEY")
	}

	body, _ := json.Marshal(map[string]any{
		"model": chatModel,
		"messages": []map[string]string{
			{"role": "system", "content": system},
			{"role": "user", "content": user},
		},
		"temperature": temperature,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.groq.com/openai/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")

	resp, err := chatClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		detail, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", fmt.Errorf("groq %s: %s", resp.Status, strings.TrimSpace(string(detail)))
	}

	var cr struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return "", err
	}
	if len(cr.Choices) == 0 {
		return "", fmt.Errorf("empty groq response")
	}
	return strings.TrimSpace(cr.Choices[0].Message.Content), nil
}
