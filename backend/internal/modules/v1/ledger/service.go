package ledger

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"patwatoli-erp/internal/modules/v1/merchant"
	"patwatoli-erp/internal/platform/apperror"
	"patwatoli-erp/internal/tax"
)

type Service struct {
	repo Repository
	db   *gorm.DB
}

func NewService(repo Repository, db *gorm.DB) *Service {
	return &Service{repo: repo, db: db}
}

func (s *Service) GetMerchantLedger(merchantIDStr string, offset, limit int, fromStr, toStr string) (*MerchantLedgerResponse, int64, error) {
	mID, err := uuid.Parse(merchantIDStr)
	if err != nil {
		return nil, 0, apperror.BadRequest("Invalid merchant ID")
	}

	var m merchant.Merchant
	if err := s.db.First(&m, "id = ?", mID).Error; err != nil {
		return nil, 0, apperror.NotFound("Merchant not found")
	}

	var fromDate, toDate *time.Time
	if fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			fromDate = &t
		}
	}
	if toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			toDate = &t
		}
	}

	entries, total, err := s.repo.GetEntries(mID, offset, limit, fromDate, toDate)
	if err != nil {
		return nil, 0, apperror.Internal("Failed to retrieve ledger entries")
	}

	currentBal, _ := s.repo.GetLatestBalance(mID)

	// Collect reference IDs to load readable descriptors (e.g. invoice_no, payment_mode)
	refMap := make(map[uuid.UUID]string)
	for _, entry := range entries {
		switch entry.TransactionType {
		case "invoice", "invoice_cancel":
			var invNo string
			if err := s.db.Table("invoices").Where("id = ?", entry.ReferenceID).Select("invoice_no").Row().Scan(&invNo); err == nil {
				if entry.TransactionType == "invoice_cancel" {
					refMap[entry.ReferenceID] = fmt.Sprintf("Cancelled Inv %s", invNo)
				} else {
					refMap[entry.ReferenceID] = fmt.Sprintf("Invoice %s", invNo)
				}
			}
		case "payment":
			var mode string
			if err := s.db.Table("payments").Where("id = ?", entry.ReferenceID).Select("payment_mode").Row().Scan(&mode); err == nil {
				refMap[entry.ReferenceID] = fmt.Sprintf("Payment (%s)", mode)
			}
		case "adjustment":
			refMap[entry.ReferenceID] = "Opening Balance / Adjustment"
		}
	}

	items := make([]LedgerItemResponse, len(entries))
	for i, e := range entries {
		desc := refMap[e.ReferenceID]
		if desc == "" {
			desc = e.TransactionType
		}

		items[i] = LedgerItemResponse{
			ID:              e.ID.String(),
			MerchantID:      e.MerchantID.String(),
			TransactionType: e.TransactionType,
			ReferenceID:     e.ReferenceID.String(),
			ReferenceText:   desc,
			Debit:           e.Debit,
			Credit:          e.Credit,
			Balance:         tax.Round2(e.Balance),
			EntryDate:       e.EntryDate.Format("2006-01-02"),
			CreatedAt:       e.CreatedAt,
		}
	}

	return &MerchantLedgerResponse{
		MerchantID:     m.ID.String(),
		MerchantName:   m.Name,
		MerchantPhone:  m.Phone,
		MerchantGSTIN:  m.GSTIN,
		CurrentBalance: tax.Round2(currentBal),
		Entries:        items,
	}, total, nil
}
