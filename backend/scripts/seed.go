package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Item struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name      string
	Unit      string
	CreatedAt time.Time
}

type ItemVariant struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	ItemID    uuid.UUID
	Size      string
	Rate      float64
	CreatedAt time.Time
}

type Merchant struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name      string
	Phone     string
	Address   string
	GSTIN     *string
	CreatedAt time.Time
}

type Ledger struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	MerchantID      uuid.UUID
	TransactionType string
	ReferenceID     uuid.UUID
	Debit           float64
	Credit          float64
	Balance         float64
	EntryDate       time.Time
	CreatedAt       time.Time
}

func main() {
	adminOnly := flag.Bool("admin", false, "Seed only the super admin user")
	demoOnly := flag.Bool("demo", false, "Seed only the demo textile items & merchants")
	flag.Parse()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://erp_user:erp_password@localhost:5432/textile_erp?sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	runAll := !*adminOnly && !*demoOnly

	if runAll || *adminOnly {
		seedAdmin(db)
	}

	if runAll || *demoOnly {
		seedDemoData(db)
	}

	fmt.Println("Database seeding completed successfully!")
}

func seedAdmin(db *gorm.DB) {
	email := "owner@patwatoli.example"
	password := "S3cure#Pass"

	var count int64
	db.Table("users").Where("lower(email) = ?", email).Count(&count)
	if count > 0 {
		fmt.Printf("Admin user '%s' already exists. Skipping.\n", email)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	user := map[string]interface{}{
		"id":            uuid.New(),
		"name":          "Patwatoli Super Admin",
		"email":         email,
		"phone":         "9876543210",
		"password_hash": string(hash),
		"role":          "super_admin",
		"is_active":     true,
	}

	if err := db.Table("users").Create(&user).Error; err != nil {
		log.Fatalf("Failed to create user: %v", err)
	}

	fmt.Printf("Successfully created super_admin user: %s\n", email)
}

func seedDemoData(db *gorm.DB) {
	fmt.Println("Seeding demo textile items and merchants...")

	// 1. Items & Variants
	sampleItems := []struct {
		Name     string
		Unit     string
		Variants []struct {
			Size string
			Rate float64
		}
	}{
		{
			Name: "Patwatoli Cotton Gamcha",
			Unit: "piece",
			Variants: []struct {
				Size string
				Rate float64
			}{
				{"A", 85.00},
				{"AA", 110.00},
				{"AAA", 140.00},
			},
		},
		{
			Name: "Bhagalpuri Chadar",
			Unit: "piece",
			Variants: []struct {
				Size string
				Rate float64
			}{
				{"A", 220.00},
				{"AA", 280.00},
				{"AAA", 350.00},
			},
		},
		{
			Name: "Textile Cotton Lungi",
			Unit: "piece",
			Variants: []struct {
				Size string
				Rate float64
			}{
				{"A", 160.00},
				{"AA", 195.00},
				{"AAA", 240.00},
			},
		},
		{
			Name: "Powerloom Rayon Fabric",
			Unit: "meter",
			Variants: []struct {
				Size string
				Rate float64
			}{
				{"K1", 45.00},
				{"K2", 65.00},
				{"K3", 90.00},
			},
		},
		{
			Name: "Traditional Khadi Towel",
			Unit: "jod",
			Variants: []struct {
				Size string
				Rate float64
			}{
				{"A", 180.00},
				{"AA", 230.00},
			},
		},
	}

	for _, it := range sampleItems {
		var existing Item
		if err := db.Table("items").Where("lower(name) = lower(?)", it.Name).First(&existing).Error; err == nil {
			fmt.Printf("Item '%s' already exists, skipping.\n", it.Name)
			continue
		}

		newItem := Item{
			ID:        uuid.New(),
			Name:      it.Name,
			Unit:      it.Unit,
			CreatedAt: time.Now().UTC(),
		}
		if err := db.Table("items").Create(&newItem).Error; err != nil {
			log.Fatalf("Failed to create item: %v", err)
		}

		for _, v := range it.Variants {
			variant := ItemVariant{
				ID:        uuid.New(),
				ItemID:    newItem.ID,
				Size:      v.Size,
				Rate:      v.Rate,
				CreatedAt: time.Now().UTC(),
			}
			if err := db.Table("item_variants").Create(&variant).Error; err != nil {
				log.Fatalf("Failed to create variant: %v", err)
			}
		}
		fmt.Printf("Created item '%s' with %d variants.\n", it.Name, len(it.Variants))
	}

	// 2. Merchants & Opening Ledgers
	gstin1 := "10AAAAA0000A1Z5"
	gstin2 := "10BBBBB1111B1Z6"
	gstin3 := "10CCCCC2222C1Z7"

	sampleMerchants := []struct {
		Name           string
		Phone          string
		Address        string
		GSTIN          *string
		OpeningBalance float64
	}{
		{
			Name:           "Maa Durga Cloth Store",
			Phone:          "9835012345",
			Address:        "Main Bazaar, Patwatoli, Gaya, Bihar",
			GSTIN:          &gstin1,
			OpeningBalance: 15400.00,
		},
		{
			Name:           "Shree Ram Vastralaya",
			Phone:          "9835023456",
			Address:        "GB Road, Gaya, Bihar",
			GSTIN:          &gstin2,
			OpeningBalance: -2500.00, // Advance
		},
		{
			Name:           "Patna Handloom Emporium",
			Phone:          "9835034567",
			Address:        "Kankarbagh Main Road, Patna, Bihar",
			GSTIN:          &gstin3,
			OpeningBalance: 42000.00,
		},
		{
			Name:           "Bodh Gaya Textile Traders",
			Phone:          "9835045678",
			Address:        "Temple Road, Bodh Gaya, Bihar",
			GSTIN:          nil,
			OpeningBalance: 0.00,
		},
	}

	for _, m := range sampleMerchants {
		var existing Merchant
		if err := db.Table("merchants").Where("lower(name) = lower(?)", m.Name).First(&existing).Error; err == nil {
			fmt.Printf("Merchant '%s' already exists, skipping.\n", m.Name)
			continue
		}

		newMerchant := Merchant{
			ID:        uuid.New(),
			Name:      m.Name,
			Phone:     m.Phone,
			Address:   m.Address,
			GSTIN:     m.GSTIN,
			CreatedAt: time.Now().UTC(),
		}
		if err := db.Table("merchants").Create(&newMerchant).Error; err != nil {
			log.Fatalf("Failed to create merchant: %v", err)
		}

		if m.OpeningBalance != 0 {
			var debit, credit float64
			if m.OpeningBalance > 0 {
				debit = m.OpeningBalance
			} else {
				credit = -m.OpeningBalance
			}

			ledger := Ledger{
				ID:              uuid.New(),
				MerchantID:      newMerchant.ID,
				TransactionType: "adjustment",
				ReferenceID:     newMerchant.ID,
				Debit:           debit,
				Credit:          credit,
				Balance:         m.OpeningBalance,
				EntryDate:       time.Now().UTC(),
				CreatedAt:       time.Now().UTC(),
			}
			if err := db.Table("ledger").Create(&ledger).Error; err != nil {
				log.Fatalf("Failed to create opening balance ledger: %v", err)
			}
		}

		fmt.Printf("Created merchant '%s' (Opening Balance: ₹%.2f)\n", m.Name, m.OpeningBalance)
	}
}
