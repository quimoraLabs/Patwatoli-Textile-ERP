package audit

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"patwatoli-erp/internal/platform/apperror"
)

type AuditLogRecord struct {
	ID        uuid.UUID       `gorm:"type:uuid;primaryKey"`
	UserID    *uuid.UUID      `gorm:"type:uuid"`
	UserName  *string         `gorm:"->"` // Joined from users.name
	Action    string          `gorm:"column:action"`
	Module    string          `gorm:"column:module"`
	RecordID  *uuid.UUID      `gorm:"column:record_id"`
	OldData   json.RawMessage `gorm:"column:old_data"`
	NewData   json.RawMessage `gorm:"column:new_data"`
	IPAddress *string         `gorm:"column:ip_address"`
	CreatedAt time.Time       `gorm:"column:created_at"`
}

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func (s *Service) List(offset, limit int, moduleFilter, actionFilter string) ([]AuditLogResponse, int64, error) {
	var total int64
	q := s.db.Table("audit_logs al").
		Select(`
			al.id, al.user_id, u.name AS user_name, al.action, al.module, 
			al.record_id, al.old_data, al.new_data, al.ip_address, al.created_at
		`).
		Joins("LEFT JOIN users u ON u.id = al.user_id")

	countQ := s.db.Table("audit_logs")
	if moduleFilter != "" {
		q = q.Where("al.module = ?", moduleFilter)
		countQ = countQ.Where("module = ?", moduleFilter)
	}
	if actionFilter != "" {
		q = q.Where("al.action = ?", actionFilter)
		countQ = countQ.Where("action = ?", actionFilter)
	}

	if err := countQ.Count(&total).Error; err != nil {
		return nil, 0, apperror.Internal("Failed to count audit logs")
	}

	var records []AuditLogRecord
	err := q.Order("al.created_at DESC").Offset(offset).Limit(limit).Scan(&records).Error
	if err != nil {
		return nil, 0, apperror.Internal("Failed to retrieve audit logs")
	}

	res := make([]AuditLogResponse, len(records))
	for i, r := range records {
		var uidStr, ridStr *string
		if r.UserID != nil {
			s := r.UserID.String()
			uidStr = &s
		}
		if r.RecordID != nil {
			s := r.RecordID.String()
			ridStr = &s
		}

		res[i] = AuditLogResponse{
			ID:        r.ID.String(),
			UserID:    uidStr,
			UserName:  r.UserName,
			Action:    r.Action,
			Module:    r.Module,
			RecordID:  ridStr,
			OldData:   r.OldData,
			NewData:   r.NewData,
			IPAddress: r.IPAddress,
			CreatedAt: r.CreatedAt,
		}
	}

	return res, total, nil
}
