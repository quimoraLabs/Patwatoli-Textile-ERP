package invoice

import "time"

type CreateInvoiceLineItem struct {
	ItemID    string   `json:"item_id" binding:"required"`
	VariantID string   `json:"variant_id" binding:"required"`
	Qty       float64  `json:"qty" binding:"required,gt=0"`
	Rate      *float64 `json:"rate,omitempty" binding:"omitempty,gte=0"` // If nil, pulled from item_variant snapshot
}

type CreateInvoiceRequest struct {
	MerchantID  string                  `json:"merchant_id" binding:"required"`
	InvoiceDate string                  `json:"invoice_date" binding:"required"` // YYYY-MM-DD
	Items       []CreateInvoiceLineItem `json:"items" binding:"required,min=1"`
}

type CancelInvoiceRequest struct {
	Reason string `json:"reason" binding:"required,min=3"`
}

type InvoiceItemResponse struct {
	ID          string  `json:"id"`
	ItemID      string  `json:"item_id"`
	ItemName    string  `json:"item_name"`
	VariantID   string  `json:"variant_id"`
	VariantSize string  `json:"variant_size"`
	Unit        string  `json:"unit"`
	Qty         float64 `json:"qty"`
	Rate        float64 `json:"rate"`
	Amount      float64 `json:"amount"`
}

type InvoiceResponse struct {
	ID            string                `json:"id"`
	InvoiceNo     string                `json:"invoice_no"`
	MerchantID    string                `json:"merchant_id"`
	MerchantName  string                `json:"merchant_name"`
	MerchantPhone string                `json:"merchant_phone,omitempty"`
	MerchantGSTIN *string               `json:"merchant_gstin,omitempty"`
	InvoiceDate   string                `json:"invoice_date"`
	TaxableAmount float64               `json:"taxable_amount"`
	CGST          float64               `json:"cgst"`
	SGST          float64               `json:"sgst"`
	TotalAmount   float64               `json:"total_amount"`
	Status        string                `json:"status"`
	CancelledAt   *time.Time            `json:"cancelled_at,omitempty"`
	CancelReason  *string               `json:"cancel_reason,omitempty"`
	CreatedAt     time.Time             `json:"created_at"`
	Items         []InvoiceItemResponse `json:"items,omitempty"`
}

func ToInvoiceResponse(inv *Invoice) InvoiceResponse {
	var items []InvoiceItemResponse
	if len(inv.Items) > 0 {
		items = make([]InvoiceItemResponse, len(inv.Items))
		for i, it := range inv.Items {
			items[i] = InvoiceItemResponse{
				ID:          it.ID.String(),
				ItemID:      it.ItemID.String(),
				ItemName:    it.Item.Name,
				VariantID:   it.VariantID.String(),
				VariantSize: it.Variant.Size,
				Unit:        it.Item.Unit,
				Qty:         it.Qty,
				Rate:        it.Rate,
				Amount:      it.Amount,
			}
		}
	}

	return InvoiceResponse{
		ID:            inv.ID.String(),
		InvoiceNo:     inv.InvoiceNo,
		MerchantID:    inv.MerchantID.String(),
		MerchantName:  inv.Merchant.Name,
		MerchantPhone: inv.Merchant.Phone,
		MerchantGSTIN: inv.Merchant.GSTIN,
		InvoiceDate:   inv.InvoiceDate.Format("2006-01-02"),
		TaxableAmount: inv.TaxableAmount,
		CGST:          inv.CGST,
		SGST:          inv.SGST,
		TotalAmount:   inv.TotalAmount,
		Status:        inv.Status,
		CancelledAt:   inv.CancelledAt,
		CancelReason:  inv.CancelReason,
		CreatedAt:     inv.CreatedAt,
		Items:         items,
	}
}
