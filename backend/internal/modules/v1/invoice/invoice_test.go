package invoice

import (
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"patwatoli-erp/internal/modules/v1/item"
	"patwatoli-erp/internal/modules/v1/merchant"
)

func TestInvoiceLifecycleAndLedger(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://erp_user:erp_password@localhost:5432/textile_erp?sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skipf("PostgreSQL not reachable for integration test: %v", err)
		return
	}

	// 1. Create test merchant
	testMerchant := merchant.Merchant{
		ID:        uuid.New(),
		Name:      "Test Weaver " + uuid.New().String()[:8],
		Phone:     "9800000001",
		CreatedAt: time.Now().UTC(),
	}
	if err := db.Create(&testMerchant).Error; err != nil {
		t.Fatalf("Failed to create test merchant: %v", err)
	}
	defer db.Delete(&testMerchant)

	// 2. Create test item and variant
	testItem := item.Item{
		ID:        uuid.New(),
		Name:      "Test Gamcha " + uuid.New().String()[:8],
		Unit:      "piece",
		CreatedAt: time.Now().UTC(),
	}
	if err := db.Create(&testItem).Error; err != nil {
		t.Fatalf("Failed to create test item: %v", err)
	}
	defer db.Delete(&testItem)

	testVariant := item.ItemVariant{
		ID:        uuid.New(),
		ItemID:    testItem.ID,
		Size:      "A",
		Rate:      150.00,
		CreatedAt: time.Now().UTC(),
	}
	if err := db.Create(&testVariant).Error; err != nil {
		t.Fatalf("Failed to create test variant: %v", err)
	}
	defer db.Delete(&testVariant)

	// 3. Instantiate Invoice Service
	repo := NewRepository(db)
	svc := NewService(repo, db)

	// 4. Create invoice: 10 pieces @ 150 = 1500 taxable. With 2.5% CGST + 2.5% SGST = 1575.00
	createReq := CreateInvoiceRequest{
		MerchantID:  testMerchant.ID.String(),
		InvoiceDate: time.Now().Format("2006-01-02"),
		Items: []CreateInvoiceLineItem{
			{
				ItemID:    testItem.ID.String(),
				VariantID: testVariant.ID.String(),
				Qty:       10,
			},
		},
	}

	inv, err := svc.Create(createReq, uuid.New().String(), "127.0.0.1")
	if err != nil {
		t.Fatalf("Failed to create invoice: %v", err)
	}

	if inv.TaxableAmount != 1500.00 {
		t.Errorf("Expected taxable amount 1500.00, got %f", inv.TaxableAmount)
	}
	if inv.TotalAmount != 1575.00 {
		t.Errorf("Expected total amount 1575.00, got %f", inv.TotalAmount)
	}

	// 5. Verify ledger entry created with running balance = 1575.00
	var ledgerBal float64
	err = db.Raw(`
		SELECT balance 
		FROM ledger 
		WHERE merchant_id = ? 
		ORDER BY created_at DESC, id DESC 
		LIMIT 1
	`, testMerchant.ID).Scan(&ledgerBal).Error
	if err != nil || ledgerBal != 1575.00 {
		t.Errorf("Expected ledger balance 1575.00, got %f (err: %v)", ledgerBal, err)
	}

	// 6. Cancel invoice
	cancelReq := CancelInvoiceRequest{
		Reason: "Wrong order quantity entered",
	}
	cancelledInv, err := svc.Cancel(inv.ID, cancelReq, uuid.New().String(), "127.0.0.1")
	if err != nil {
		t.Fatalf("Failed to cancel invoice: %v", err)
	}

	if cancelledInv.Status != "cancelled" {
		t.Errorf("Expected status cancelled, got %s", cancelledInv.Status)
	}

	// 7. Verify ledger reversed balance back to 0.00
	err = db.Raw(`
		SELECT balance 
		FROM ledger 
		WHERE merchant_id = ? 
		ORDER BY created_at DESC, id DESC 
		LIMIT 1
	`, testMerchant.ID).Scan(&ledgerBal).Error
	if err != nil || ledgerBal != 0.00 {
		t.Errorf("Expected ledger balance after cancel 0.00, got %f", ledgerBal)
	}

	// Clean up invoice & ledger test records
	db.Exec("DELETE FROM ledger WHERE merchant_id = ?", testMerchant.ID)
	db.Exec("DELETE FROM invoice_items WHERE invoice_id = ?", inv.ID)
	db.Exec("DELETE FROM invoices WHERE id = ?", inv.ID)
}
