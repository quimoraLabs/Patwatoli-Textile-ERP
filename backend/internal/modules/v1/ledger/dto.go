package ledger

import "time"

type LedgerItemResponse struct {
	ID              string    `json:"id"`
	MerchantID      string    `json:"merchant_id"`
	TransactionType string    `json:"transaction_type"`
	ReferenceID     string    `json:"reference_id"`
	ReferenceText   string    `json:"reference_text,omitempty"`
	Debit           float64   `json:"debit"`
	Credit          float64   `json:"credit"`
	Balance         float64   `json:"balance"`
	EntryDate       string    `json:"entry_date"`
	CreatedAt       time.Time `json:"created_at"`
}

type MerchantLedgerResponse struct {
	MerchantID     string               `json:"merchant_id"`
	MerchantName   string               `json:"merchant_name"`
	MerchantPhone  string               `json:"merchant_phone,omitempty"`
	MerchantGSTIN  *string              `json:"merchant_gstin,omitempty"`
	CurrentBalance float64              `json:"current_balance"`
	Entries        []LedgerItemResponse `json:"entries"`
}
