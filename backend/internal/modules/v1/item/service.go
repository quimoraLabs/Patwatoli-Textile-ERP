package item

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/platform/apperror"
	"patwatoli-erp/internal/tax"
)

type Service struct {
	repo Repository
	db   *gorm.DB
}

func NewService(repo Repository, db *gorm.DB) *Service {
	return &Service{repo: repo, db: db}
}

func (s *Service) Create(req CreateItemRequest, actorID, clientIP string) (*ItemResponse, error) {
	newItem := &Item{
		ID:        uuid.New(),
		Name:      req.Name,
		Unit:      req.Unit,
		CreatedAt: time.Now().UTC(),
	}

	for _, v := range req.Variants {
		newItem.Variants = append(newItem.Variants, ItemVariant{
			ID:        uuid.New(),
			ItemID:    newItem.ID,
			Size:      v.Size,
			Rate:      tax.Round2(v.Rate),
			CreatedAt: time.Now().UTC(),
		})
	}

	if err := s.repo.Create(newItem); err != nil {
		return nil, apperror.Conflict("Item with this name may already exist: " + err.Error())
	}

	res := ToItemResponse(newItem)
	recID := newItem.ID.String()
	middleware.LogAudit(s.db, &actorID, "create", "items", &recID, nil, res, clientIP)

	return &res, nil
}

func (s *Service) GetByID(idStr string) (*ItemResponse, error) {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, apperror.BadRequest("Invalid item ID")
	}

	item, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("Item not found")
		}
		return nil, apperror.Internal("Failed to retrieve item")
	}

	res := ToItemResponse(item)
	return &res, nil
}

func (s *Service) List(offset, limit int, search string) ([]ItemResponse, int64, error) {
	items, total, err := s.repo.List(offset, limit, search)
	if err != nil {
		return nil, 0, apperror.Internal("Failed to retrieve items")
	}

	res := make([]ItemResponse, len(items))
	for i, item := range items {
		res[i] = ToItemResponse(&item)
	}

	return res, total, nil
}

func (s *Service) Update(idStr string, req UpdateItemRequest, actorID, clientIP string) (*ItemResponse, error) {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, apperror.BadRequest("Invalid item ID")
	}

	item, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("Item not found")
		}
		return nil, apperror.Internal("Failed to retrieve item")
	}

	if req.Name != nil {
		item.Name = *req.Name
	}
	if req.Unit != nil {
		item.Unit = *req.Unit
	}

	if err := s.repo.Update(item); err != nil {
		return nil, apperror.Internal("Failed to update item")
	}

	res := ToItemResponse(item)
	recID := item.ID.String()
	middleware.LogAudit(s.db, &actorID, "update", "items", &recID, nil, res, clientIP)

	return &res, nil
}

func (s *Service) Delete(idStr, actorID, clientIP string) error {
	id, err := uuid.Parse(idStr)
	if err != nil {
		return apperror.BadRequest("Invalid item ID")
	}

	var invoiceCount int64
	s.db.Table("invoice_items").Where("item_id = ?", id).Count(&invoiceCount)
	if invoiceCount > 0 {
		return apperror.Conflict("Cannot delete item used in past invoices")
	}

	// Delete variants first then item
	s.db.Where("item_id = ?", id).Delete(&ItemVariant{})
	if err := s.repo.Delete(id); err != nil {
		return apperror.Internal("Failed to delete item")
	}

	recID := idStr
	middleware.LogAudit(s.db, &actorID, "delete", "items", &recID, nil, nil, clientIP)
	return nil
}

func (s *Service) AddVariant(itemIDStr string, req AddVariantRequest, actorID, clientIP string) (*VariantResponse, error) {
	itemID, err := uuid.Parse(itemIDStr)
	if err != nil {
		return nil, apperror.BadRequest("Invalid item ID")
	}

	v := &ItemVariant{
		ID:        uuid.New(),
		ItemID:    itemID,
		Size:      req.Size,
		Rate:      tax.Round2(req.Rate),
		CreatedAt: time.Now().UTC(),
	}

	if err := s.repo.AddVariant(v); err != nil {
		return nil, apperror.Conflict("Variant size may already exist for this item")
	}

	res := &VariantResponse{
		ID:        v.ID.String(),
		ItemID:    v.ItemID.String(),
		Size:      v.Size,
		Rate:      v.Rate,
		CreatedAt: v.CreatedAt,
	}

	recID := v.ID.String()
	middleware.LogAudit(s.db, &actorID, "create", "items", &recID, nil, res, clientIP)

	return res, nil
}

func (s *Service) UpdateVariant(variantIDStr string, req UpdateVariantRequest, actorID, clientIP string) (*VariantResponse, error) {
	variantID, err := uuid.Parse(variantIDStr)
	if err != nil {
		return nil, apperror.BadRequest("Invalid variant ID")
	}

	v, err := s.repo.GetVariantByID(variantID)
	if err != nil {
		return nil, apperror.NotFound("Variant not found")
	}

	v.Rate = tax.Round2(req.Rate)
	if err := s.repo.UpdateVariant(v); err != nil {
		return nil, apperror.Internal("Failed to update variant")
	}

	res := &VariantResponse{
		ID:        v.ID.String(),
		ItemID:    v.ItemID.String(),
		Size:      v.Size,
		Rate:      v.Rate,
		CreatedAt: v.CreatedAt,
	}

	recID := v.ID.String()
	middleware.LogAudit(s.db, &actorID, "update", "items", &recID, nil, res, clientIP)

	return res, nil
}

func (s *Service) DeleteVariant(variantIDStr, actorID, clientIP string) error {
	variantID, err := uuid.Parse(variantIDStr)
	if err != nil {
		return apperror.BadRequest("Invalid variant ID")
	}

	var invoiceCount int64
	s.db.Table("invoice_items").Where("variant_id = ?", variantID).Count(&invoiceCount)
	if invoiceCount > 0 {
		return apperror.Conflict("Cannot delete variant used in past invoices")
	}

	if err := s.repo.DeleteVariant(variantID); err != nil {
		return apperror.Internal("Failed to delete variant")
	}

	recID := variantIDStr
	middleware.LogAudit(s.db, &actorID, "delete", "items", &recID, nil, nil, clientIP)
	return nil
}
