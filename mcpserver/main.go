// MCP server — exposes structured tools over Dayflow HRMS data.
// Calls the backend's admin API using a shared internal service token
// (no DB driver, no direct database access).
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

var (
	apiBase       = "http://localhost:8080"
	internalToken string
)

type employeeIDInput struct {
	UserID int `json:"user_id"`
}

type attendanceRangeInput struct {
	UserID int    `json:"user_id"`
	Range  string `json:"range,omitempty"`
}

type todaysAttendanceInput struct {
	Date string `json:"date,omitempty"`
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
	internalToken = os.Getenv("MCP_INTERNAL_TOKEN")

	server := mcp.NewServer(&mcp.Implementation{Name: "dayflow-hrms-mcp", Version: "1.0"}, nil)

	addTool(server, "list_employees",
		"List all employees with their employee ID, name, role, job title, and department.",
		func(ctx context.Context, _ struct{}) (string, error) {
			return callAPI(ctx, "/api/employees", nil)
		})

	addTool(server, "get_todays_attendance",
		"Get today's attendance status for every employee (or a specific date if given, YYYY-MM-DD).",
		func(ctx context.Context, in todaysAttendanceInput) (string, error) {
			params := map[string]string{}
			if in.Date != "" {
				params["date"] = in.Date
			}
			return callAPI(ctx, "/api/attendance/all", params)
		})

	addTool(server, "get_employee_attendance",
		"Get a specific employee's attendance history. user_id is a numeric id from list_employees — never invent one. range is 'daily' or 'weekly'.",
		func(ctx context.Context, in attendanceRangeInput) (string, error) {
			params := map[string]string{}
			if in.Range != "" {
				params["range"] = in.Range
			}
			return callAPI(ctx, fmt.Sprintf("/api/attendance/%d", in.UserID), params)
		})

	addTool(server, "get_pending_leave_requests",
		"Get every leave request across all employees, including status (pending/approved/rejected).",
		func(ctx context.Context, _ struct{}) (string, error) {
			return callAPI(ctx, "/api/leave/all", nil)
		})

	addTool(server, "get_employee_payroll",
		"Get a specific employee's salary structure and net pay. user_id is a numeric id from list_employees — never invent one.",
		func(ctx context.Context, in employeeIDInput) (string, error) {
			return callAPI(ctx, fmt.Sprintf("/api/payroll/%d", in.UserID), nil)
		})

	addTool(server, "get_employee_profile",
		"Get a specific employee's profile: personal and job details. user_id is a numeric id from list_employees — never invent one.",
		func(ctx context.Context, in employeeIDInput) (string, error) {
			return callAPI(ctx, fmt.Sprintf("/api/profile/%d", in.UserID), nil)
		})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	handler := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server { return server }, nil)
	fmt.Printf("mcp server listening on :%s\n", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		fmt.Fprintf(os.Stderr, "mcp: %v\n", err)
		os.Exit(1)
	}
}

func callAPI(ctx context.Context, path string, params map[string]string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiBase+path, nil)
	if err != nil {
		return "", err
	}
	if internalToken != "" {
		req.Header.Set("X-Internal-Token", internalToken)
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
