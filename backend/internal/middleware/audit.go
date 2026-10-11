package middleware

import (
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuditLog struct {
	ID        uuid.UUID       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    *uuid.UUID      `gorm:"type:uuid"`
	Action    string          `gorm:"column:action;type:varchar(20);not null"`
	Module    string          `gorm:"column:module;type:varchar(40);not null"`
	RecordID  *uuid.UUID      `gorm:"type:uuid;column:record_id"`
	OldData   json.RawMessage `gorm:"type:jsonb;column:old_data"`
	NewData   json.RawMessage `gorm:"type:jsonb;column:new_data"`
	IPAddress *string         `gorm:"type:inet;column:ip_address"`
	CreatedAt time.Time       `gorm:"column:created_at"`
}

func (AuditLog) TableName() string {
	return "audit_logs"
}

func LogAudit(db *gorm.DB, userIDStr *string, action, module string, recordIDStr *string, oldData, newData interface{}, ip string) {
	var userUUID *uuid.UUID
	if userIDStr != nil && *userIDStr != "" {
		if u, err := uuid.Parse(*userIDStr); err == nil {
			var exists int64
			if err := db.Table("users").Where("id = ?", u).Count(&exists).Error; err == nil && exists > 0 {
				userUUID = &u
			}
		}
	}

	var recUUID *uuid.UUID
	if recordIDStr != nil && *recordIDStr != "" {
		if r, err := uuid.Parse(*recordIDStr); err == nil {
			recUUID = &r
		}
	}

	var oldJSON, newJSON json.RawMessage
	if oldData != nil {
		oldJSON, _ = json.Marshal(oldData)
	}
	if newData != nil {
		newJSON, _ = json.Marshal(newData)
	}

	var ipPtr *string
	if ip != "" {
		ipPtr = &ip
	}

	logEntry := AuditLog{
		ID:        uuid.New(),
		UserID:    userUUID,
		Action:    action,
		Module:    module,
		RecordID:  recUUID,
		OldData:   oldJSON,
		NewData:   newJSON,
		IPAddress: ipPtr,
		CreatedAt: time.Now().UTC(),
	}

	if err := db.Create(&logEntry).Error; err != nil {
		slog.Error("failed to write audit log", "error", err, "module", module, "action", action)
	}
}
