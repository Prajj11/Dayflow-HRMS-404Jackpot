package ask

import (
	"context"
	"fmt"
	"os"

	"google.golang.org/genai"
)

type GeminiSelector struct {
	client *genai.Client
	model  string
}

func NewGeminiSelector(ctx context.Context) (*GeminiSelector, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  os.Getenv("GEMINI_API_KEY"),
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, err
	}
	return &GeminiSelector{client: client, model: "gemini-2.5-flash-lite"}, nil
}

func (g *GeminiSelector) SelectTool(ctx context.Context, question string, tools []ToolSchema) (*ToolCall, error) {
	var funcDecls []*genai.FunctionDeclaration
	for _, t := range tools {
		props := map[string]*genai.Schema{}
		var required []string
		for _, p := range t.Params {
			props[p.Name] = &genai.Schema{Type: genai.TypeString}
			if p.Required {
				required = append(required, p.Name)
			}
		}
		funcDecls = append(funcDecls, &genai.FunctionDeclaration{
			Name:        t.Name,
			Description: t.Description,
			Parameters: &genai.Schema{
				Type:       genai.TypeObject,
				Properties: props,
				Required:   required,
			},
		})
	}

	config := &genai.GenerateContentConfig{
		Tools: []*genai.Tool{
			{FunctionDeclarations: funcDecls},
		},
		ToolConfig: &genai.ToolConfig{
			FunctionCallingConfig: &genai.FunctionCallingConfig{
				Mode: genai.FunctionCallingConfigModeAny,
			},
		},
	}

	resp, err := g.client.Models.GenerateContent(ctx, g.model,
		genai.Text(question), config)
	if err != nil {
		return nil, fmt.Errorf("gemini: %w", err)
	}

	for _, part := range resp.Candidates[0].Content.Parts {
		if part.FunctionCall != nil {
			params := map[string]string{}
			for k, v := range part.FunctionCall.Args {
				params[k] = fmt.Sprintf("%v", v)
			}
			return &ToolCall{Tool: part.FunctionCall.Name, Params: params}, nil
		}
	}
	return nil, fmt.Errorf("no function call in response")
}
