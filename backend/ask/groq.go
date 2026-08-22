package ask

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

// GroqSelector uses Groq's OpenAI-compatible endpoint with Llama 3.3 70B.
type GroqSelector struct {
	apiKey string
	model  string
}

func NewGroqSelector() *GroqSelector {
	return &GroqSelector{
		apiKey: os.Getenv("GROQ_API_KEY"),
		model:  "llama-3.3-70b-versatile",
	}
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqTool struct {
	Type     string       `json:"type"`
	Function groqToolFunc `json:"function"`
}

type groqToolFunc struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  groqToolParams `json:"parameters"`
}

type groqToolParams struct {
	Type       string              `json:"type"`
	Properties map[string]groqProp `json:"properties"`
	Required   []string            `json:"required"`
}

type groqProp struct {
	Type string `json:"type"`
}

type groqRequest struct {
	Model      string        `json:"model"`
	Messages   []groqMessage `json:"messages"`
	Tools      []groqTool    `json:"tools"`
	ToolChoice string        `json:"tool_choice"`
}

type groqResponse struct {
	Choices []struct {
		Message struct {
			ToolCalls []struct {
				Function struct {
					Name      string `json:"name"`
					Arguments string `json:"arguments"`
				} `json:"function"`
			} `json:"tool_calls"`
		} `json:"message"`
	} `json:"choices"`
}

func (g *GroqSelector) SelectTool(ctx context.Context, question string, tools []ToolSchema) (*ToolCall, error) {
	var groqTools []groqTool
	for _, t := range tools {
		props := map[string]groqProp{}
		required := []string{} // must be empty array, never null
		for _, p := range t.Params {
			props[p.Name] = groqProp{Type: p.Type}
			if p.Required {
				required = append(required, p.Name)
			}
		}
		groqTools = append(groqTools, groqTool{
			Type: "function",
			Function: groqToolFunc{
				Name:        t.Name,
				Description: t.Description,
				Parameters: groqToolParams{
					Type:       "object",
					Properties: props,
					Required:   required,
				},
			},
		})
	}

	payload := groqRequest{
		Model: g.model,
		Messages: []groqMessage{
			{Role: "system", Content: "You are an access-control analytics assistant. Use ONLY the provided tools. Rules: (1) If the question contains 'user <number>' like 'user 16426', you MUST call user_entries with that org_user_id. (2) Always provide start and end as YYYY-MM-DD strings. (3) Never invent tool names. (4) Pick the most specific tool available."},
			{Role: "user", Content: question},
		},
		Tools:      groqTools,
		ToolChoice: "required",
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.groq.com/openai/v1/chat/completions",
		bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+g.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errBody map[string]any
		json.NewDecoder(resp.Body).Decode(&errBody)
		return nil, fmt.Errorf("groq %s: %v", resp.Status, errBody)
	}

	var gr groqResponse
	if err := json.NewDecoder(resp.Body).Decode(&gr); err != nil {
		return nil, err
	}

	if len(gr.Choices) == 0 || len(gr.Choices[0].Message.ToolCalls) == 0 {
		return nil, fmt.Errorf("no tool call in groq response")
	}

	tc := gr.Choices[0].Message.ToolCalls[0].Function
	var raw map[string]any
	if err := json.Unmarshal([]byte(tc.Arguments), &raw); err != nil {
		return nil, fmt.Errorf("groq args parse: %w", err)
	}
	args := map[string]string{}
	for k, v := range raw {
		args[k] = fmt.Sprintf("%v", v)
	}

	return &ToolCall{Tool: tc.Name, Params: args}, nil
}
