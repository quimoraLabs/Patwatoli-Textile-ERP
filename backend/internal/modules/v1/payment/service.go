package payment

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"patwatoli-erp/internal/middleware"
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

func (s *Service) Create(req CreatePaymentRequest, actorID, clientIP string) (*PaymentResponse, error) {
	merchantID, err := uuid.Parse(req.MerchantID)
	if err != nil {
		return nil, apperror.BadRequest("Invalid merchant ID")
	}

	paymentDate, err := time.Parse("2006-01-02", req.PaymentDate)
	if err != nil {
		return nil, apperror.BadRequest("Invalid payment date format. Expected YYYY-MM-DD")
	}

	var m merchant.Merchant
	if err := s.db.First(&m, "id = ?", merchantID).Error; err != nil {
		return nil, apperror.NotFound("Merchant not found")
	}

	amount := tax.Round2(req.Amount)
	paymentID := uuid.New()
	newPayment := &Payment{
		ID:          paymentID,
		MerchantID:  merchantID,
		Amount:      amount,
		PaymentMode: req.PaymentMode,
		PaymentDate: paymentDate,
		CreatedAt:   time.Now().UTC(),
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(newPayment).Error; err != nil {
			return err
		}

		// Read previous balance with row lock
		var previousBalance float64
		row := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Raw(`
				SELECT balance 
				FROM ledger 
				WHERE merchant_id = ? 
				ORDER BY created_at DESC, id DESC 
				LIMIT 1
			`, merchantID).Row()

		if err := row.Scan(&previousBalance); err != nil {
			previousBalance = 0.0
		}

		// Payment is a credit entry: reduces merchant balance
		newBalance := tax.Round2(previousBalance - amount)

		ledgerEntry := map[string]interface{}{
			"id":               uuid.New(),
			"merchant_id":      merchantID,
			"transaction_type": "payment",
			"reference_id":     paymentID,
			"debit":            0.0,
			"credit":           amount,
			"balance":          newBalance,
			"entry_date":       paymentDate.Format("2006-01-02"),
			"created_at":       time.Now().UTC(),
		}

		if err := tx.Table("ledger").Create(&ledgerEntry).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, apperror.Internal("Failed to record payment: " + err.Error())
	}

	fullPayment, err := s.repo.GetByID(paymentID)
	if err != nil {
		return nil, apperror.Internal("Failed to load payment record")
	}

	res := ToPaymentResponse(fullPayment)
	recID := paymentID.String()
	middleware.LogAudit(s.db, &actorID, "create", "payments", &recID, nil, res, clientIP)

	return &res, nil
}

func (s *Service) GetByID(idStr string) (*PaymentResponse, error) {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, apperror.BadRequest("Invalid payment ID")
	}

	p, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("Payment not found")
		}
		return nil, apperror.Internal("Failed to retrieve payment")
	}

	res := ToPaymentResponse(p)
	return &res, nil
}

func (s *Service) List(offset, limit int, merchantIDStr, fromStr, toStr string) ([]PaymentResponse, int64, error) {
	var mID *uuid.UUID
	if merchantIDStr != "" {
		if parsed, err := uuid.Parse(merchantIDStr); err == nil {
			mID = &parsed
		}
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

	payments, total, err := s.repo.List(offset, limit, mID, fromDate, toDate)
	if err != nil {
		return nil, 0, apperror.Internal("Failed to retrieve payments")
	}

	res := make([]PaymentResponse, len(payments))
	for i, p := range payments {
		res[i] = ToPaymentResponse(&p)
	}

	return res, total, nil
}
