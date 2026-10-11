package dashboard

type TopMerchantItem struct {
	MerchantID     string  `json:"merchant_id"`
	MerchantName   string  `json:"merchant_name"`
	MerchantPhone  string  `json:"merchant_phone,omitempty"`
	TotalSales     float64 `json:"total_sales"`
	CurrentBalance float64 `json:"current_balance"`
}

type RecentInvoiceItem struct {
	ID           string  `json:"id"`
	InvoiceNo    string  `json:"invoice_no"`
	MerchantName string  `json:"merchant_name"`
	InvoiceDate  string  `json:"invoice_date"`
	TotalAmount  float64 `json:"total_amount"`
	Status       string  `json:"status"`
}

type RecentPaymentItem struct {
	ID           string  `json:"id"`
	MerchantName string  `json:"merchant_name"`
	PaymentDate  string  `json:"payment_date"`
	PaymentMode  string  `json:"payment_mode"`
	Amount       float64 `json:"amount"`
}

type DashboardMetricsResponse struct {
	MonthlySales        float64              `json:"monthly_sales"`
	MonthlyTaxable      float64              `json:"monthly_taxable"`
	MonthlyTax          float64              `json:"monthly_tax"`
	MonthlyIncome       float64              `json:"monthly_income"`
	TotalOutstanding    float64              `json:"total_outstanding"`
	TotalAdvance        float64              `json:"total_advance"`
	ActiveInvoicesCount int64                `json:"active_invoices_count"`
	MerchantsCount      int64                `json:"merchants_count"`
	TopMerchants        []TopMerchantItem    `json:"top_merchants"`
	RecentInvoices      []RecentInvoiceItem  `json:"recent_invoices"`
	RecentPayments      []RecentPaymentItem  `json:"recent_payments"`
}
