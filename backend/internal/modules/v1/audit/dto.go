package audit

import (
	"encoding/json"
	"time"
)

type AuditLogResponse struct {
	ID        string          `json:"id"`
	UserID    *string         `json:"user_id,omitempty"`
	UserName  *string         `json:"user_name,omitempty"`
	Action    string          `json:"action"`
	Module    string          `json:"module"`
	RecordID  *string         `json:"record_id,omitempty"`
	OldData   json.RawMessage `json:"old_data,omitempty"`
	NewData   json.RawMessage `json:"new_data,omitempty"`
	IPAddress *string         `json:"ip_address,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
}
