package setting

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/platform/apperror"
)

type SettingEntity struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Key         string     `gorm:"type:varchar(80);not null;uniqueIndex"`
	Value       string     `gorm:"type:text;not null"`
	Description string     `gorm:"type:text"`
	UpdatedBy   *uuid.UUID `gorm:"type:uuid"`
	UpdatedAt   time.Time  `gorm:"not null;default:now()"`
}

func (SettingEntity) TableName() string {
	return "settings"
}

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func (s *Service) List() ([]SettingResponse, error) {
	var list []SettingEntity
	if err := s.db.Order("key ASC").Find(&list).Error; err != nil {
		return nil, apperror.Internal("Failed to retrieve settings")
	}

	res := make([]SettingResponse, len(list))
	for i, item := range list {
		res[i] = SettingResponse{
			ID:          item.ID.String(),
			Key:         item.Key,
			Value:       item.Value,
			Description: item.Description,
			UpdatedAt:   item.UpdatedAt,
		}
	}

	return res, nil
}

func (s *Service) UpdateSettings(req UpdateSettingsRequest, actorIDStr, clientIP string) error {
	var userUUID *uuid.UUID
	if actorIDStr != "" {
		if u, err := uuid.Parse(actorIDStr); err == nil {
			userUUID = &u
		}
	}

	now := time.Now().UTC()
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for k, v := range req.Settings {
			if err := tx.Model(&SettingEntity{}).Where("key = ?", k).Updates(map[string]interface{}{
				"value":      v,
				"updated_by": userUUID,
				"updated_at": now,
			}).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return apperror.Internal("Failed to update settings: " + err.Error())
	}

	middleware.LogAudit(s.db, &actorIDStr, "update", "settings", nil, nil, req.Settings, clientIP)
	return nil
}
