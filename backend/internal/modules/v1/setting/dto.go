package setting

import "time"

type SettingResponse struct {
	ID          string    `json:"id"`
	Key         string    `json:"key"`
	Value       string    `json:"value"`
	Description string    `json:"description,omitempty"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type UpdateSettingsRequest struct {
	Settings map[string]string `json:"settings" binding:"required"`
}
