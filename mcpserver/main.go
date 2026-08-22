// MCP server — exposes structured tools over access-control data.
// No DB driver imported. All tools are HTTP calls to /api/q/*.
// No name or employee_code is accessible through any tool.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

var apiBase = "http://localhost:8080"

type timeInput struct {
	Start string `json:"start"`
	End   string `json:"end"`
	Limit int    `json:"limit,omitempty"`
}

type userInput struct {
	OrgUserID int64  `json:"org_user_id"`
	Start     string `json:"start"`
	End       string `json:"end"`
}

type doorInput struct {
	AccessPointID int64  `json:"access_point_id"`
	Start         string `json:"start"`
	End           string `json:"end"`
}

func addTool[In any](s *mcp.Server, name, desc string, fn func(context.Context, In) (string, error)) {
	mcp.AddTool(s, &mcp.Tool{Name: name, Description: desc},
		func(ctx context.Context, req *mcp.CallToolRequest, input In) (*mcp.CallToolResult, In, error) {
			text, err := fn(ctx, input)
			if err != nil {
				return nil, input, err
			}
			return &mcp.CallToolResult{Content: []mcp.Content{&mcp.TextContent{Text: text}}}, input, nil
		},
	)
}

func main() {
	if b := os.Getenv("QUERY_API_BASE"); b != "" {
		apiBase = b
	}

	server := mcp.NewServer(&mcp.Implementation{Name: "activity-digest-mcp", Version: "2.0"}, nil)

	addTool(server, "get_user_entries",
		"Get badge-in count and daily breakdown for a specific user. org_user_id is a numeric id from the question — never invent one.",
		func(ctx context.Context, in userInput) (string, error) {
			return callAPI(ctx, "/api/q/user-entries", map[string]string{
				"org_user_id": fmt.Sprint(in.OrgUserID),
				"start": in.Start, "end": in.End,
			})
		})

	addTool(server, "get_door_activity",
		"Get entry count and hourly breakdown for a specific door. access_point_id is a numeric id from the question — never invent one.",
		func(ctx context.Context, in doorInput) (string, error) {
			return callAPI(ctx, "/api/q/door-activity", map[string]string{
				"access_point_id": fmt.Sprint(in.AccessPointID),
				"start": in.Start, "end": in.End,
			})
		})

	addTool(server, "get_org_summary",
		"Get org-wide summary: active users, total entries, peak hour, silent doors.",
		func(ctx context.Context, in timeInput) (string, error) {
			return callAPI(ctx, "/api/q/org-summary", map[string]string{"start": in.Start, "end": in.End})
		})

	addTool(server, "get_hourly_breakdown",
		"Get total entry count broken down by hour of day for a time range.",
		func(ctx context.Context, in timeInput) (string, error) {
			return callAPI(ctx, "/api/q/hourly-breakdown", map[string]string{"start": in.Start, "end": in.End})
		})

	addTool(server, "get_user_list",
		"Get all org_user_id values. Returns IDs only — no names.",
		func(ctx context.Context, _ struct{}) (string, error) {
			return callAPI(ctx, "/api/q/user-list", nil)
		})

	addTool(server, "get_door_list",
		"Get all doors with their access_point_id and serial names.",
		func(ctx context.Context, _ struct{}) (string, error) {
			return callAPI(ctx, "/api/q/door-list", nil)
		})

	addTool(server, "get_top_users",
		"Get the most active users by entry count in a time range. Returns org_user_id and count.",
		func(ctx context.Context, in timeInput) (string, error) {
			return callAPI(ctx, "/api/q/top-users", map[string]string{
				"start": in.Start, "end": in.End, "limit": fmt.Sprint(in.Limit),
			})
		})

	addTool(server, "get_top_doors",
		"Get the most active doors by entry count in a time range.",
		func(ctx context.Context, in timeInput) (string, error) {
			return callAPI(ctx, "/api/q/top-doors", map[string]string{
				"start": in.Start, "end": in.End, "limit": fmt.Sprint(in.Limit),
			})
		})

	if err := server.Run(context.Background(), &mcp.StdioTransport{}); err != nil {
		fmt.Fprintf(os.Stderr, "mcp: %v\n", err)
		os.Exit(1)
	}
}

func callAPI(ctx context.Context, path string, params map[string]string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiBase+path, nil)
	if err != nil {
		return "", err
	}
	q := req.URL.Query()
	for k, v := range params {
		if v != "" && v != "0" {
			q.Set(k, v)
		}
	}
	req.URL.RawQuery = q.Encode()

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("%s: %s", path, resp.Status)
	}
	var pretty any
	json.Unmarshal(body, &pretty)
	out, _ := json.MarshalIndent(pretty, "", "  ")
	return string(out), nil
}
