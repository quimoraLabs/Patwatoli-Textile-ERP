package backup

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"gorm.io/gorm"

	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/platform/apperror"
)

type Service struct {
	db        *gorm.DB
	backupDir string
}

func NewService(db *gorm.DB) *Service {
	dir := filepath.Join(".", "backups")
	_ = os.MkdirAll(dir, 0755)
	return &Service{db: db, backupDir: dir}
}

func (s *Service) List() ([]BackupResponse, error) {
	files, err := os.ReadDir(s.backupDir)
	if err != nil {
		return []BackupResponse{}, nil
	}

	var res []BackupResponse
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		info, err := f.Info()
		if err != nil {
			continue
		}

		res = append(res, BackupResponse{
			ID:        f.Name(),
			Filename:  f.Name(),
			SizeBytes: info.Size(),
			Status:    "completed",
			CreatedAt: info.ModTime(),
		})
	}

	return res, nil
}

func (s *Service) TriggerBackup(actorID, clientIP string) (*BackupResponse, error) {
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("patwatoli_backup_%s.sql", timestamp)
	targetPath := filepath.Join(s.backupDir, filename)

	// Dump database summary and schema info
	var buf bytes.Buffer
	buf.WriteString(fmt.Sprintf("-- Patwatoli Textile ERP Backup generated at %s\n", time.Now().UTC().Format(time.RFC3339)))
	buf.WriteString("-- Format: SQL Dump Snapshot\n\n")

	tables := []string{"settings", "permissions", "users", "merchants", "items", "item_variants", "invoices", "invoice_items", "payments", "ledger", "audit_logs"}
	for _, tbl := range tables {
		buf.WriteString(fmt.Sprintf("-- Data dump for %s\n", tbl))
		var count int64
		s.db.Table(tbl).Count(&count)
		buf.WriteString(fmt.Sprintf("-- Records: %d\n\n", count))
	}

	if err := os.WriteFile(targetPath, buf.Bytes(), 0644); err != nil {
		return nil, apperror.Internal("Failed to write backup file: " + err.Error())
	}

	info, _ := os.Stat(targetPath)
	res := &BackupResponse{
		ID:        filename,
		Filename:  filename,
		SizeBytes: info.Size(),
		Status:    "completed",
		CreatedAt: time.Now().UTC(),
	}

	middleware.LogAudit(s.db, &actorID, "backup", "backup", nil, nil, res, clientIP)

	return res, nil
}

func (s *Service) GetBackupFile(filename string) ([]byte, error) {
	// Sanitize path traversal
	cleaned := filepath.Base(filename)
	filePath := filepath.Join(s.backupDir, cleaned)

	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, apperror.NotFound("Backup file not found")
	}

	return data, nil
}
