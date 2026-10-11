package payment

import "time"

type CreatePaymentRequest struct {
	MerchantID  string  `json:"merchant_id" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	PaymentMode string  `json:"payment_mode" binding:"required,oneof=cash bank upi"`
	PaymentDate string  `json:"payment_date" binding:"required"` // YYYY-MM-DD
}

type PaymentResponse struct {
	ID            string    `json:"id"`
	MerchantID    string    `json:"merchant_id"`
	MerchantName  string    `json:"merchant_name"`
	MerchantPhone string    `json:"merchant_phone,omitempty"`
	Amount        float64   `json:"amount"`
	PaymentMode   string    `json:"payment_mode"`
	PaymentDate   string    `json:"payment_date"`
	CreatedAt     time.Time `json:"created_at"`
}

func ToPaymentResponse(p *Payment) PaymentResponse {
	return PaymentResponse{
		ID:            p.ID.String(),
		MerchantID:    p.MerchantID.String(),
		MerchantName:  p.Merchant.Name,
		MerchantPhone: p.Merchant.Phone,
		Amount:        p.Amount,
		PaymentMode:   p.PaymentMode,
		PaymentDate:   p.PaymentDate.Format("2006-01-02"),
		CreatedAt:     p.CreatedAt,
	}
}
