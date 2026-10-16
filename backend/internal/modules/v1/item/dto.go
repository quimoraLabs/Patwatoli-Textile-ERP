package item

import "time"

type CreateVariantDTO struct {
	Size     string  `json:"size" binding:"required,max=100"`
	Rate     float64 `json:"rate" binding:"required,gte=0"`
	ImageURL string  `json:"image_url,omitempty"`
}

type CreateItemRequest struct {
	Name        string             `json:"name" binding:"required,max=150"`
	Category    string             `json:"category,omitempty" binding:"omitempty,max=100"`
	Unit        string             `json:"unit" binding:"required,oneof=chauka jod piece meter"`
	ImageURL    string             `json:"image_url,omitempty"`
	Description string             `json:"description,omitempty"`
	Variants    []CreateVariantDTO `json:"variants,omitempty"`
}

type UpdateItemRequest struct {
	Name        *string `json:"name,omitempty" binding:"omitempty,max=150"`
	Category    *string `json:"category,omitempty" binding:"omitempty,max=100"`
	Unit        *string `json:"unit,omitempty" binding:"omitempty,oneof=chauka jod piece meter"`
	ImageURL    *string `json:"image_url,omitempty"`
	Description *string `json:"description,omitempty"`
}

type AddVariantRequest struct {
	Size     string  `json:"size" binding:"required,max=100"`
	Rate     float64 `json:"rate" binding:"required,gte=0"`
	ImageURL string  `json:"image_url,omitempty"`
}

type UpdateVariantRequest struct {
	Rate     float64 `json:"rate" binding:"required,gte=0"`
	ImageURL *string `json:"image_url,omitempty"`
}

type VariantResponse struct {
	ID        string    `json:"id"`
	ItemID    string    `json:"item_id"`
	Size      string    `json:"size"`
	Rate      float64   `json:"rate"`
	ImageURL  string    `json:"image_url,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type ItemResponse struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Category    string            `json:"category,omitempty"`
	Unit        string            `json:"unit"`
	ImageURL    string            `json:"image_url,omitempty"`
	Description string            `json:"description,omitempty"`
	Variants    []VariantResponse `json:"variants"`
	CreatedAt   time.Time         `json:"created_at"`
}

func ToItemResponse(item *Item) ItemResponse {
	variants := make([]VariantResponse, len(item.Variants))
	for i, v := range item.Variants {
		variants[i] = VariantResponse{
			ID:        v.ID.String(),
			ItemID:    v.ItemID.String(),
			Size:      v.Size,
			Rate:      v.Rate,
			ImageURL:  v.ImageURL,
			CreatedAt: v.CreatedAt,
		}
	}
	return ItemResponse{
		ID:          item.ID.String(),
		Name:        item.Name,
		Category:    item.Category,
		Unit:        item.Unit,
		ImageURL:    item.ImageURL,
		Description: item.Description,
		Variants:    variants,
		CreatedAt:   item.CreatedAt,
	}
}
