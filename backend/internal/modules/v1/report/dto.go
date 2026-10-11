package report

type SalesReportItem struct {
	Date          string  `json:"date"`
	InvoicesCount int64   `json:"invoices_count"`
	TaxableAmount float64 `json:"taxable_amount"`
	CGST          float64 `json:"cgst"`
	SGST          float64 `json:"sgst"`
	TotalAmount   float64 `json:"total_amount"`
}

type MerchantWiseReportItem struct {
	MerchantID     string  `json:"merchant_id"`
	MerchantName   string  `json:"merchant_name"`
	Phone          string  `json:"phone,omitempty"`
	GSTIN          *string `json:"gstin,omitempty"`
	TotalInvoiced  float64 `json:"total_invoiced"`
	TotalPaid      float64 `json:"total_paid"`
	CurrentBalance float64 `json:"current_balance"`
}

type ItemWiseReportItem struct {
	ItemID      string  `json:"item_id"`
	ItemName    string  `json:"item_name"`
	VariantID   string  `json:"variant_id"`
	VariantSize string  `json:"variant_size"`
	Unit        string  `json:"unit"`
	TotalQty    float64 `json:"total_qty"`
	TotalAmount float64 `json:"total_amount"`
}

type GSTReportSummary struct {
	FromDate      string  `json:"from_date"`
	ToDate        string  `json:"to_date"`
	ActiveBills   int64   `json:"active_bills"`
	TaxableAmount float64 `json:"taxable_amount"`
	CGST          float64 `json:"cgst"`
	SGST          float64 `json:"sgst"`
	TotalTax      float64 `json:"total_tax"`
	GrandTotal    float64 `json:"grand_total"`
}
