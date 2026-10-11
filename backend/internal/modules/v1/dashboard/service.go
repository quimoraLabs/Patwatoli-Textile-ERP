package dashboard

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

func (s *Service) GetMetrics() (*DashboardMetricsResponse, error) {
	now := time.Now().UTC()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	startOfNextMonth := startOfMonth.AddDate(0, 1, 0)

	// Monthly Sales and Tax (active only)
	type SalesSummary struct {
		Taxable float64
		Tax     float64
		Total   float64
		Count   int64
	}
	var salesSum SalesSummary
	err := s.db.Raw(`
		SELECT 
			COALESCE(SUM(taxable_amount), 0) AS taxable,
			COALESCE(SUM(cgst + sgst), 0)    AS tax,
			COALESCE(SUM(total_amount), 0)   AS total,
			COUNT(id)                        AS count
		FROM invoices
		WHERE status = 'active'
		  AND invoice_date >= ?
		  AND invoice_date < ?
	`, startOfMonth, startOfNextMonth).Scan(&salesSum).Error
	if err != nil {
		return nil, apperror.Internal("Failed to calculate monthly sales")
	}

	// Monthly Income (payments received)
	var monthlyIncome float64
	s.db.Raw(`
		SELECT COALESCE(SUM(amount), 0)
		FROM payments
		WHERE payment_date >= ?
		  AND payment_date < ?
	`, startOfMonth, startOfNextMonth).Scan(&monthlyIncome)

	// Outstanding & Advance from latest ledger entries
	type OutstandingAdvance struct {
		Outstanding float64
		Advance     float64
	}
	var outAdv OutstandingAdvance
	s.db.Raw(`
		WITH latest AS (
			SELECT DISTINCT ON (merchant_id) merchant_id, balance
			FROM ledger
			ORDER BY merchant_id, created_at DESC, id DESC
		)
		SELECT
			COALESCE(SUM(balance) FILTER (WHERE balance > 0), 0)  AS outstanding,
			COALESCE(-SUM(balance) FILTER (WHERE balance < 0), 0) AS advance
		FROM latest
	`).Scan(&outAdv)

	var merchantsCount int64
	s.db.Table("merchants").Count(&merchantsCount)

	// Top Merchants by Sales
	type TopMerchantRow struct {
		MerchantID   string
		MerchantName string
		Phone        string
		TotalSales   float64
	}
	var topRows []TopMerchantRow
	s.db.Raw(`
		SELECT 
			m.id AS merchant_id,
			m.name AS merchant_name,
			m.phone AS phone,
			COALESCE(SUM(i.total_amount), 0) AS total_sales
		FROM merchants m
		LEFT JOIN invoices i ON i.merchant_id = m.id AND i.status = 'active'
		GROUP BY m.id, m.name, m.phone
		ORDER BY total_sales DESC
		LIMIT 5
	`).Scan(&topRows)

	topMerchants := make([]TopMerchantItem, len(topRows))
	for i, r := range topRows {
		var bal float64
		s.db.Raw(`
			SELECT balance FROM ledger WHERE merchant_id = ? ORDER BY created_at DESC, id DESC LIMIT 1
		`, r.MerchantID).Scan(&bal)

		topMerchants[i] = TopMerchantItem{
			MerchantID:     r.MerchantID,
			MerchantName:   r.MerchantName,
			MerchantPhone:  r.Phone,
			TotalSales:     tax.Round2(r.TotalSales),
			CurrentBalance: tax.Round2(bal),
		}
	}

	// Recent 5 Invoices
	type RecentInvRow struct {
		ID           string
		InvoiceNo    string
		MerchantName string
		InvoiceDate  time.Time
		TotalAmount  float64
		Status       string
	}
	var recentInvRows []RecentInvRow
	s.db.Raw(`
		SELECT i.id, i.invoice_no, m.name AS merchant_name, i.invoice_date, i.total_amount, i.status
		FROM invoices i
		JOIN merchants m ON m.id = i.merchant_id
		ORDER BY i.created_at DESC
		LIMIT 5
	`).Scan(&recentInvRows)

	recentInvoices := make([]RecentInvoiceItem, len(recentInvRows))
	for i, inv := range recentInvRows {
		recentInvoices[i] = RecentInvoiceItem{
			ID:           inv.ID,
			InvoiceNo:    inv.InvoiceNo,
			MerchantName: inv.MerchantName,
			InvoiceDate:  inv.InvoiceDate.Format("2006-01-02"),
			TotalAmount:  tax.Round2(inv.TotalAmount),
			Status:       inv.Status,
		}
	}

	// Recent 5 Payments
	type RecentPayRow struct {
		ID           string
		MerchantName string
		PaymentDate  time.Time
		PaymentMode  string
		Amount       float64
	}
	var recentPayRows []RecentPayRow
	s.db.Raw(`
		SELECT p.id, m.name AS merchant_name, p.payment_date, p.payment_mode, p.amount
		FROM payments p
		JOIN merchants m ON m.id = p.merchant_id
		ORDER BY p.created_at DESC
		LIMIT 5
	`).Scan(&recentPayRows)

	recentPayments := make([]RecentPaymentItem, len(recentPayRows))
	for i, pay := range recentPayRows {
		recentPayments[i] = RecentPaymentItem{
			ID:           pay.ID,
			MerchantName: pay.MerchantName,
			PaymentDate:  pay.PaymentDate.Format("2006-01-02"),
			PaymentMode:  pay.PaymentMode,
			Amount:       tax.Round2(pay.Amount),
		}
	}

	return &DashboardMetricsResponse{
		MonthlySales:        tax.Round2(salesSum.Total),
		MonthlyTaxable:      tax.Round2(salesSum.Taxable),
		MonthlyTax:          tax.Round2(salesSum.Tax),
		MonthlyIncome:       tax.Round2(monthlyIncome),
		TotalOutstanding:    tax.Round2(outAdv.Outstanding),
		TotalAdvance:        tax.Round2(outAdv.Advance),
		ActiveInvoicesCount: salesSum.Count,
		MerchantsCount:      merchantsCount,
		TopMerchants:        topMerchants,
		RecentInvoices:      recentInvoices,
		RecentPayments:      recentPayments,
	}, nil
}
