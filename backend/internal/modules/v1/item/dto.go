package item

import "time"

type CreateVariantDTO struct {
	Size string  `json:"size" binding:"required,oneof=A AA AAA K1 K2 K3"`
	Rate float64 `json:"rate" binding:"required,gte=0"`
}

type CreateItemRequest struct {
	Name     string             `json:"name" binding:"required,max=150"`
	Unit     string             `json:"unit" binding:"required,oneof=chauka jod piece meter"`
	Variants []CreateVariantDTO `json:"variants,omitempty"`
}

type UpdateItemRequest struct {
	Name *string `json:"name,omitempty" binding:"omitempty,max=150"`
	Unit *string `json:"unit,omitempty" binding:"omitempty,oneof=chauka jod piece meter"`
}

type AddVariantRequest struct {
	Size string  `json:"size" binding:"required,oneof=A AA AAA K1 K2 K3"`
	Rate float64 `json:"rate" binding:"required,gte=0"`
}

type UpdateVariantRequest struct {
	Rate float64 `json:"rate" binding:"required,gte=0"`
}

type VariantResponse struct {
	ID        string    `json:"id"`
	ItemID    string    `json:"item_id"`
	Size      string    `json:"size"`
	Rate      float64   `json:"rate"`
	CreatedAt time.Time `json:"created_at"`
}

type ItemResponse struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Unit      string            `json:"unit"`
	Variants  []VariantResponse `json:"variants"`
	CreatedAt time.Time         `json:"created_at"`
}

func ToItemResponse(item *Item) ItemResponse {
	variants := make([]VariantResponse, len(item.Variants))
	for i, v := range item.Variants {
		variants[i] = VariantResponse{
			ID:        v.ID.String(),
			ItemID:    v.ItemID.String(),
			Size:      v.Size,
			Rate:      v.Rate,
			CreatedAt: v.CreatedAt,
		}
	}
	return ItemResponse{
		ID:        item.ID.String(),
		Name:      item.Name,
		Unit:      item.Unit,
		Variants:  variants,
		CreatedAt: item.CreatedAt,
	}
}
