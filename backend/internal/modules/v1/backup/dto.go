package backup

import "time"

type BackupResponse struct {
	ID        string    `json:"id"`
	Filename  string    `json:"filename"`
	SizeBytes int64     `json:"size_bytes"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}
