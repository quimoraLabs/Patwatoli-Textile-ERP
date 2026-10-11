package merchant

import "time"

type CreateMerchantRequest struct {
	Name           string   `json:"name" binding:"required,max=150"`
	Phone          string   `json:"phone,omitempty" binding:"omitempty,max=15"`
	Address        string   `json:"address,omitempty"`
	GSTIN          *string  `json:"gstin,omitempty"`
	OpeningBalance *float64 `json:"opening_balance,omitempty"` // Positive = outstanding debit, negative = advance credit
}

type UpdateMerchantRequest struct {
	Name    *string `json:"name,omitempty" binding:"omitempty,max=150"`
	Phone   *string `json:"phone,omitempty" binding:"omitempty,max=15"`
	Address *string `json:"address,omitempty"`
	GSTIN   *string `json:"gstin,omitempty"`
}

type MerchantResponse struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Phone          string    `json:"phone,omitempty"`
	Address        string    `json:"address,omitempty"`
	GSTIN          *string   `json:"gstin,omitempty"`
	CurrentBalance float64   `json:"current_balance"`
	CreatedAt      time.Time `json:"created_at"`
}
