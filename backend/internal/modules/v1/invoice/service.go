package invoice

import (
	"errors"
	"strconv"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/modules/v1/item"
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

func (s *Service) Create(req CreateInvoiceRequest, actorID, clientIP string) (*InvoiceResponse, error) {
	merchantID, err := uuid.Parse(req.MerchantID)
	if err != nil {
		return nil, apperror.BadRequest("Invalid merchant ID")
	}

	invoiceDate, err := parseInvoiceDate(req.InvoiceDate)
	if err != nil {
		return nil, apperror.BadRequest("Invalid invoice date/time format. Expected YYYY-MM-DD or YYYY-MM-DDTHH:mm")
	}

	var m merchant.Merchant
	if err := s.db.First(&m, "id = ?", merchantID).Error; err != nil {
		return nil, apperror.NotFound("Merchant not found")
	}

	if len(req.Items) == 0 {
		return nil, apperror.BadRequest("At least one line item is required")
	}

	// Fetch tax rates from settings
	cgstRate := 2.5
	sgstRate := 2.5

	var cgstSetting, sgstSetting string
	if err := s.db.Table("settings").Where("key = ?", "tax.cgst_rate").Select("value").Row().Scan(&cgstSetting); err == nil {
		if r, err := strconv.ParseFloat(cgstSetting, 64); err == nil {
			cgstRate = r
		}
	}
	if err := s.db.Table("settings").Where("key = ?", "tax.sgst_rate").Select("value").Row().Scan(&sgstSetting); err == nil {
		if r, err := strconv.ParseFloat(sgstSetting, 64); err == nil {
			sgstRate = r
		}
	}

	// Resolve items and calculate line amounts
	type PreparedLine struct {
		ItemID    uuid.UUID
		VariantID uuid.UUID
		Qty       float64
		Rate      float64
		Amount    float64
	}

	var preparedLines []PreparedLine
	var taxableTotal float64

	for _, it := range req.Items {
		itID, err := uuid.Parse(it.ItemID)
		if err != nil {
			return nil, apperror.BadRequest("Invalid item ID: " + it.ItemID)
		}
		varID, err := uuid.Parse(it.VariantID)
		if err != nil {
			return nil, apperror.BadRequest("Invalid variant ID: " + it.VariantID)
		}

		var variant item.ItemVariant
		if err := s.db.First(&variant, "id = ? AND item_id = ?", varID, itID).Error; err != nil {
			return nil, apperror.BadRequest("Item variant not found or does not belong to item")
		}

		rate := variant.Rate
		if it.Rate != nil {
			rate = *it.Rate
		}
		rate = tax.Round2(rate)
		qty := tax.Round2(it.Qty)
		amount := tax.Round2(qty * rate)

		taxableTotal = tax.Round2(taxableTotal + amount)
		preparedLines = append(preparedLines, PreparedLine{
			ItemID:    itID,
			VariantID: varID,
			Qty:       qty,
			Rate:      rate,
			Amount:    amount,
		})
	}

	gstCalc := tax.CalculateGST(taxableTotal, cgstRate, sgstRate)

	invoiceID := uuid.New()
	var createdInvoice Invoice

	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Generate invoice number inside transaction
		invNo, err := GenerateNextInvoiceNo(tx, invoiceDate)
		if err != nil {
			return err
		}

		createdInvoice = Invoice{
			ID:            invoiceID,
			InvoiceNo:     invNo,
			MerchantID:    merchantID,
			InvoiceDate:   invoiceDate,
			TaxableAmount: gstCalc.TaxableAmount,
			CGST:          gstCalc.CGST,
			SGST:          gstCalc.SGST,
			TotalAmount:   gstCalc.TotalAmount,
			Status:        "active",
			CreatedAt:     time.Now().UTC(),
		}

		if err := tx.Create(&createdInvoice).Error; err != nil {
			return err
		}

		for _, pl := range preparedLines {
			lineItem := InvoiceItem{
				ID:        uuid.New(),
				InvoiceID: invoiceID,
				ItemID:    pl.ItemID,
				VariantID: pl.VariantID,
				Qty:       pl.Qty,
				Rate:      pl.Rate,
				Amount:    pl.Amount,
			}
			if err := tx.Create(&lineItem).Error; err != nil {
				return err
			}
		}

		// Retrieve latest running balance with row lock
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

		newBalance := tax.Round2(previousBalance + gstCalc.TotalAmount)

		ledgerEntry := map[string]interface{}{
			"id":               uuid.New(),
			"merchant_id":      merchantID,
			"transaction_type": "invoice",
			"reference_id":     invoiceID,
			"debit":            gstCalc.TotalAmount,
			"credit":           0.0,
			"balance":          newBalance,
			"entry_date":       invoiceDate.Format("2006-01-02"),
			"created_at":       time.Now().UTC(),
		}

		if err := tx.Table("ledger").Create(&ledgerEntry).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, apperror.Internal("Failed to create invoice: " + err.Error())
	}

	fullInvoice, err := s.repo.GetByID(invoiceID)
	if err != nil {
		return nil, apperror.Internal("Failed to load created invoice")
	}

	res := ToInvoiceResponse(fullInvoice)
	recID := invoiceID.String()
	middleware.LogAudit(s.db, &actorID, "create", "invoices", &recID, nil, res, clientIP)

	return &res, nil
}

func (s *Service) GetByID(idStr string) (*InvoiceResponse, error) {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, apperror.BadRequest("Invalid invoice ID")
	}

	inv, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("Invoice not found")
		}
		return nil, apperror.Internal("Failed to retrieve invoice")
	}

	res := ToInvoiceResponse(inv)
	return &res, nil
}

func (s *Service) List(offset, limit int, merchantIDStr, status, fromStr, toStr string) ([]InvoiceResponse, int64, error) {
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

	invoices, total, err := s.repo.List(offset, limit, mID, status, fromDate, toDate)
	if err != nil {
		return nil, 0, apperror.Internal("Failed to retrieve invoices")
	}

	res := make([]InvoiceResponse, len(invoices))
	for i, inv := range invoices {
		res[i] = ToInvoiceResponse(&inv)
	}

	return res, total, nil
}

func (s *Service) Cancel(idStr string, req CancelInvoiceRequest, actorID, clientIP string) (*InvoiceResponse, error) {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, apperror.BadRequest("Invalid invoice ID")
	}

	inv, err := s.repo.GetByID(id)
	if err != nil {
		return nil, apperror.NotFound("Invoice not found")
	}

	if inv.Status == "cancelled" {
		return nil, apperror.Conflict("Invoice is already cancelled")
	}

	now := time.Now().UTC()

	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Update invoice cancellation fields
		if err := tx.Model(&Invoice{}).Where("id = ?", id).Updates(map[string]interface{}{
			"status":        "cancelled",
			"cancelled_at":  now,
			"cancel_reason": req.Reason,
		}).Error; err != nil {
			return err
		}

		// Read merchant's latest balance with row lock
		var previousBalance float64
		row := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Raw(`
				SELECT balance 
				FROM ledger 
				WHERE merchant_id = ? 
				ORDER BY created_at DESC, id DESC 
				LIMIT 1
			`, inv.MerchantID).Row()

		if err := row.Scan(&previousBalance); err != nil {
			previousBalance = 0.0
		}

		// Reversing entry: credit the invoice amount
		newBalance := tax.Round2(previousBalance - inv.TotalAmount)

		ledgerEntry := map[string]interface{}{
			"id":               uuid.New(),
			"merchant_id":      inv.MerchantID,
			"transaction_type": "invoice_cancel",
			"reference_id":     inv.ID,
			"debit":            0.0,
			"credit":           inv.TotalAmount,
			"balance":          newBalance,
			"entry_date":       now.Format("2006-01-02"),
			"created_at":       now,
		}

		if err := tx.Table("ledger").Create(&ledgerEntry).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, apperror.Internal("Failed to cancel invoice: " + err.Error())
	}

	updatedInv, err := s.repo.GetByID(id)
	if err != nil {
		return nil, apperror.Internal("Failed to load cancelled invoice")
	}

	res := ToInvoiceResponse(updatedInv)
	recID := id.String()
	middleware.LogAudit(s.db, &actorID, "update", "invoices", &recID, map[string]string{"action": "cancel", "status": "active"}, res, clientIP)

	return &res, nil
}

func (s *Service) GeneratePDF(idStr string) ([]byte, string, error) {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, "", apperror.BadRequest("Invalid invoice ID")
	}

	inv, err := s.repo.GetByID(id)
	if err != nil {
		return nil, "", apperror.NotFound("Invoice not found")
	}

	// Company details lookup
	var compName, compAddr, compGSTIN string
	s.db.Table("settings").Where("key = ?", "company.name").Select("value").Row().Scan(&compName)
	s.db.Table("settings").Where("key = ?", "company.address").Select("value").Row().Scan(&compAddr)
	s.db.Table("settings").Where("key = ?", "company.gstin").Select("value").Row().Scan(&compGSTIN)

	if compName == "" {
		compName = "Patwatoli Textile"
	}
	if compAddr == "" {
		compAddr = "Patwatoli, Gaya, Bihar"
	}

	company := CompanySettings{
		Name:    compName,
		Address: compAddr,
		GSTIN:   compGSTIN,
	}

	pdfBytes, err := GenerateInvoicePDF(inv, company)
	if err != nil {
		return nil, "", apperror.Internal("Failed to generate PDF invoice: " + err.Error())
	}

	filename := inv.InvoiceNo + ".pdf"
	return pdfBytes, filename, nil
}

func parseInvoiceDate(raw string) (time.Time, error) {
	formats := []string{
		"2006-01-02T15:04",
		"2006-01-02 15:04",
		"2006-01-02T15:04:05",
		time.RFC3339,
		"2006-01-02",
	}
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		loc = time.FixedZone("IST", 5*3600+30*60)
	}

	for _, layout := range formats {
		if t, err := time.ParseInLocation(layout, raw, loc); err == nil {
			return t, nil
		}
	}
	return time.Time{}, errors.New("invalid invoice date format")
}

