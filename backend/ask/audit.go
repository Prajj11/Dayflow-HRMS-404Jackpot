package ask

import (
	"encoding/json"
	"os"
	"sync"
	"time"
)

type auditEntry struct {
	AskedAt     time.Time `json:"asked_at"`
	AdminID     string    `json:"admin_id"`
	Question    string    `json:"question"`
	ResolvedIDs []int64   `json:"resolved_ids"`
	ToolCalled  string    `json:"tool_called"`
	SQL         string    `json:"sql,omitempty"`
	Answered    bool      `json:"answered"`
}

var (
	auditMu   sync.Mutex
	auditFile *os.File
)

func initAudit(path string) error {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	auditFile = f
	return nil
}

func writeAudit(e auditEntry) {
	auditMu.Lock()
	defer auditMu.Unlock()
	if auditFile == nil {
		return
	}
	b, _ := json.Marshal(e)
	auditFile.Write(append(b, '\n'))
}
