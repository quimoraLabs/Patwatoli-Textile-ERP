package report

import (
	"time"

	"gorm.io/gorm"

	"patwatoli-erp/internal/platform/apperror"
	"patwatoli-erp/internal/tax"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func parseDateRange(fromStr, toStr string) (time.Time, time.Time) {
	now := time.Now().UTC()
	var from, to time.Time

	if fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t
		}
	}
	if from.IsZero() {
		from = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	}

	if toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t
		}
	}
	if to.IsZero() {
		to = now
	}

	return from, to
}

func (s *Service) GetSalesReport(fromStr, toStr string) ([]SalesReportItem, error) {
	from, to := parseDateRange(fromStr, toStr)

	type Row struct {
		Date    time.Time
		Count   int64
		Taxable float64
		CGST    float64
		SGST    float64
		Total   float64
	}

	var rows []Row
	err := s.db.Raw(`
		SELECT 
			invoice_date AS date,
			COUNT(id) AS count,
			COALESCE(SUM(taxable_amount), 0) AS taxable,
			COALESCE(SUM(cgst), 0) AS cgst,
			COALESCE(SUM(sgst), 0) AS sgst,
			COALESCE(SUM(total_amount), 0) AS total
		FROM invoices
		WHERE status = 'active'
		  AND invoice_date >= ? AND invoice_date <= ?
		GROUP BY invoice_date
		ORDER BY invoice_date ASC
	`, from, to).Scan(&rows).Error

	if err != nil {
		return nil, apperror.Internal("Failed to generate sales report")
	}

	res := make([]SalesReportItem, len(rows))
	for i, r := range rows {
		res[i] = SalesReportItem{
			Date:          r.Date.Format("2006-01-02"),
			InvoicesCount: r.Count,
			TaxableAmount: tax.Round2(r.Taxable),
			CGST:          tax.Round2(r.CGST),
			SGST:          tax.Round2(r.SGST),
			TotalAmount:   tax.Round2(r.Total),
		}
	}

	return res, nil
}

func (s *Service) GetMerchantWiseReport(fromStr, toStr string) ([]MerchantWiseReportItem, error) {
	from, to := parseDateRange(fromStr, toStr)

	type Row struct {
		MerchantID    string
		MerchantName  string
		Phone         string
		GSTIN         *string
		TotalInvoiced float64
		TotalPaid     float64
	}

	var rows []Row
	err := s.db.Raw(`
		SELECT 
			m.id AS merchant_id,
			m.name AS merchant_name,
			m.phone AS phone,
			m.gstin AS gstin,
			COALESCE(inv.total_inv, 0) AS total_invoiced,
			COALESCE(pay.total_pay, 0) AS total_paid
		FROM merchants m
		LEFT JOIN (
			SELECT merchant_id, SUM(total_amount) AS total_inv
			FROM invoices
			WHERE status = 'active' AND invoice_date >= ? AND invoice_date <= ?
			GROUP BY merchant_id
		) inv ON inv.merchant_id = m.id
		LEFT JOIN (
			SELECT merchant_id, SUM(amount) AS total_pay
			FROM payments
			WHERE payment_date >= ? AND payment_date <= ?
			GROUP BY merchant_id
		) pay ON pay.merchant_id = m.id
		ORDER BY m.name ASC
	`, from, to, from, to).Scan(&rows).Error

	if err != nil {
		return nil, apperror.Internal("Failed to generate merchant-wise report")
	}

	res := make([]MerchantWiseReportItem, len(rows))
	for i, r := range rows {
		var bal float64
		s.db.Raw(`
			SELECT balance FROM ledger WHERE merchant_id = ? ORDER BY created_at DESC, id DESC LIMIT 1
		`, r.MerchantID).Scan(&bal)

		res[i] = MerchantWiseReportItem{
			MerchantID:     r.MerchantID,
			MerchantName:   r.MerchantName,
			Phone:          r.Phone,
			GSTIN:          r.GSTIN,
			TotalInvoiced:  tax.Round2(r.TotalInvoiced),
			TotalPaid:      tax.Round2(r.TotalPaid),
			CurrentBalance: tax.Round2(bal),
		}
	}

	return res, nil
}

func (s *Service) GetItemWiseReport(fromStr, toStr string) ([]ItemWiseReportItem, error) {
	from, to := parseDateRange(fromStr, toStr)

	type Row struct {
		ItemID      string
		ItemName    string
		VariantID   string
		VariantSize string
		Unit        string
		TotalQty    float64
		TotalAmount float64
	}

	var rows []Row
	err := s.db.Raw(`
		SELECT 
			it.id AS item_id,
			it.name AS item_name,
			iv.id AS variant_id,
			iv.size AS variant_size,
			it.unit AS unit,
			COALESCE(SUM(ii.qty), 0) AS total_qty,
			COALESCE(SUM(ii.amount), 0) AS total_amount
		FROM invoice_items ii
		JOIN invoices i ON i.id = ii.invoice_id
		JOIN items it ON it.id = ii.item_id
		JOIN item_variants iv ON iv.id = ii.variant_id
		WHERE i.status = 'active'
		  AND i.invoice_date >= ? AND i.invoice_date <= ?
		GROUP BY it.id, it.name, iv.id, iv.size, it.unit
		ORDER BY it.name ASC, iv.size ASC
	`, from, to).Scan(&rows).Error

	if err != nil {
		return nil, apperror.Internal("Failed to generate item-wise report")
	}

	res := make([]ItemWiseReportItem, len(rows))
	for i, r := range rows {
		res[i] = ItemWiseReportItem{
			ItemID:      r.ItemID,
			ItemName:    r.ItemName,
			VariantID:   r.VariantID,
			VariantSize: r.VariantSize,
			Unit:        r.Unit,
			TotalQty:    tax.Round2(r.TotalQty),
			TotalAmount: tax.Round2(r.TotalAmount),
		}
	}

	return res, nil
}

func (s *Service) GetGSTReport(fromStr, toStr string) (*GSTReportSummary, error) {
	from, to := parseDateRange(fromStr, toStr)

	type Row struct {
		Count   int64
		Taxable float64
		CGST    float64
		SGST    float64
		Total   float64
	}

	var r Row
	err := s.db.Raw(`
		SELECT 
			COUNT(id) AS count,
			COALESCE(SUM(taxable_amount), 0) AS taxable,
			COALESCE(SUM(cgst), 0) AS cgst,
			COALESCE(SUM(sgst), 0) AS sgst,
			COALESCE(SUM(total_amount), 0) AS total
		FROM invoices
		WHERE status = 'active'
		  AND invoice_date >= ? AND invoice_date <= ?
	`, from, to).Scan(&r).Error

	if err != nil {
		return nil, apperror.Internal("Failed to generate GST report")
	}

	totalTax := tax.Round2(r.CGST + r.SGST)

	return &GSTReportSummary{
		FromDate:      from.Format("2006-01-02"),
		ToDate:        to.Format("2006-01-02"),
		ActiveBills:   r.Count,
		TaxableAmount: tax.Round2(r.Taxable),
		CGST:          tax.Round2(r.CGST),
		SGST:          tax.Round2(r.SGST),
		TotalTax:      totalTax,
		GrandTotal:    tax.Round2(r.Total),
	}, nil
}
