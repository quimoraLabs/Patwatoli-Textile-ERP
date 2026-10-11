package merchant

import (
	"errors"
	"regexp"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/platform/apperror"
	"patwatoli-erp/internal/tax"
)

var gstinRegex = regexp.MustCompile(`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`)

type Service struct {
	repo Repository
	db   *gorm.DB
}

func NewService(repo Repository, db *gorm.DB) *Service {
	return &Service{repo: repo, db: db}
}

func (s *Service) Create(req CreateMerchantRequest, actorID, clientIP string) (*MerchantResponse, error) {
	if req.GSTIN != nil && *req.GSTIN != "" {
		if !gstinRegex.MatchString(*req.GSTIN) {
			return nil, apperror.BadRequest("Invalid GSTIN format. Expected 15-character Indian GST format.")
		}
	}

	newMerchant := &Merchant{
		ID:        uuid.New(),
		Name:      req.Name,
		Phone:     req.Phone,
		Address:   req.Address,
		GSTIN:     req.GSTIN,
		CreatedAt: time.Now().UTC(),
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(newMerchant).Error; err != nil {
			return err
		}

		if req.OpeningBalance != nil && *req.OpeningBalance != 0 {
			opening := tax.Round2(*req.OpeningBalance)
			var debit, credit float64
			if opening > 0 {
				debit = opening
			} else {
				credit = -opening
			}

			ledgerEntry := map[string]interface{}{
				"id":               uuid.New(),
				"merchant_id":      newMerchant.ID,
				"transaction_type": "adjustment",
				"reference_id":     newMerchant.ID,
				"debit":            debit,
				"credit":           credit,
				"balance":          opening,
				"entry_date":       time.Now().UTC().Format("2006-01-02"),
				"created_at":       time.Now().UTC(),
			}

			if err := tx.Table("ledger").Create(&ledgerEntry).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, apperror.Internal("Failed to create merchant: " + err.Error())
	}

	currentBal := 0.0
	if req.OpeningBalance != nil {
		currentBal = tax.Round2(*req.OpeningBalance)
	}

	res := &MerchantResponse{
		ID:             newMerchant.ID.String(),
		Name:           newMerchant.Name,
		Phone:          newMerchant.Phone,
		Address:        newMerchant.Address,
		GSTIN:          newMerchant.GSTIN,
		CurrentBalance: currentBal,
		CreatedAt:      newMerchant.CreatedAt,
	}

	recID := newMerchant.ID.String()
	middleware.LogAudit(s.db, &actorID, "create", "merchants", &recID, nil, res, clientIP)

	return res, nil
}

func (s *Service) GetByID(idStr string) (*MerchantResponse, error) {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, apperror.BadRequest("Invalid merchant ID")
	}

	m, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("Merchant not found")
		}
		return nil, apperror.Internal("Failed to retrieve merchant")
	}

	bal, _ := s.repo.GetMerchantBalance(m.ID)

	return &MerchantResponse{
		ID:             m.ID.String(),
		Name:           m.Name,
		Phone:          m.Phone,
		Address:        m.Address,
		GSTIN:          m.GSTIN,
		CurrentBalance: tax.Round2(bal),
		CreatedAt:      m.CreatedAt,
	}, nil
}

func (s *Service) List(offset, limit int, search string) ([]MerchantResponse, int64, error) {
	merchants, total, err := s.repo.List(offset, limit, search)
	if err != nil {
		return nil, 0, apperror.Internal("Failed to retrieve merchants")
	}

	ids := make([]uuid.UUID, len(merchants))
	for i, m := range merchants {
		ids[i] = m.ID
	}

	balances, _ := s.repo.GetBalancesForMerchants(ids)

	res := make([]MerchantResponse, len(merchants))
	for i, m := range merchants {
		bal := balances[m.ID]
		res[i] = MerchantResponse{
			ID:             m.ID.String(),
			Name:           m.Name,
			Phone:          m.Phone,
			Address:        m.Address,
			GSTIN:          m.GSTIN,
			CurrentBalance: tax.Round2(bal),
			CreatedAt:      m.CreatedAt,
		}
	}

	return res, total, nil
}

func (s *Service) Update(idStr string, req UpdateMerchantRequest, actorID, clientIP string) (*MerchantResponse, error) {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, apperror.BadRequest("Invalid merchant ID")
	}

	m, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("Merchant not found")
		}
		return nil, apperror.Internal("Failed to retrieve merchant")
	}

	if req.GSTIN != nil && *req.GSTIN != "" {
		if !gstinRegex.MatchString(*req.GSTIN) {
			return nil, apperror.BadRequest("Invalid GSTIN format")
		}
		m.GSTIN = req.GSTIN
	}

	if req.Name != nil {
		m.Name = *req.Name
	}
	if req.Phone != nil {
		m.Phone = *req.Phone
	}
	if req.Address != nil {
		m.Address = *req.Address
	}

	if err := s.repo.Update(m); err != nil {
		return nil, apperror.Internal("Failed to update merchant")
	}

	bal, _ := s.repo.GetMerchantBalance(m.ID)
	res := &MerchantResponse{
		ID:             m.ID.String(),
		Name:           m.Name,
		Phone:          m.Phone,
		Address:        m.Address,
		GSTIN:          m.GSTIN,
		CurrentBalance: tax.Round2(bal),
		CreatedAt:      m.CreatedAt,
	}

	recID := m.ID.String()
	middleware.LogAudit(s.db, &actorID, "update", "merchants", &recID, nil, res, clientIP)

	return res, nil
}

func (s *Service) Delete(idStr, actorID, clientIP string) error {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return apperror.BadRequest("Invalid merchant ID")
	}

	m, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperror.NotFound("Merchant not found")
		}
		return apperror.Internal("Failed to retrieve merchant")
	}

	// Check if merchant has existing invoices or ledger entries
	var invoiceCount int64
	s.db.Table("invoices").Where("merchant_id = ?", id).Count(&invoiceCount)
	if invoiceCount > 0 {
		return apperror.Conflict("Cannot delete merchant with existing invoices")
	}

	if err := s.repo.Delete(id); err != nil {
		return apperror.Internal("Failed to delete merchant")
	}

	recID := m.ID.String()
	middleware.LogAudit(s.db, &actorID, "delete", "merchants", &recID, m, nil, clientIP)

	return nil
}
