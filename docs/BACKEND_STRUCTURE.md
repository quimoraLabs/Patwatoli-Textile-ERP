# Backend Structure (Go)

## Purpose
This document describes the Go project layout, module conventions, and starter code so that new versions (V2 suppliers, V3 AI, and so on) can be added without touching existing modules.

---

## 1. Technology

| Item | Choice |
|------|--------|
| Language | Go 1.23+ |
| HTTP framework | Gin |
| ORM | GORM with the pgx v5 driver (`gorm.io/driver/postgres`) |
| Migrations | golang-migrate (plain SQL) |
| Validation | go-playground/validator |
| Auth | golang-jwt/jwt v5, bcrypt |
| Cache | go-redis v9 |
| Config | Environment variables |
| Logging | `log/slog` (JSON) |
| PDF | `github.com/go-pdf/fpdf` or chromedp (HTML to PDF) — start with fpdf |

## 2. Folder Structure

```
backend/
├── cmd/
│   └── api/
│       └── main.go                  # Entry point
├── internal/
│   ├── config/
│   │   └── config.go                # Env loading
│   ├── platform/                    # Shared infrastructure (no business logic)
│   │   ├── database/postgres.go
│   │   ├── cache/redis.go
│   │   ├── logger/logger.go
│   │   ├── response/response.go     # Success/error envelope helpers
│   │   ├── apperror/apperror.go
│   │   └── pagination/pagination.go
│   ├── middleware/
│   │   ├── request_id.go
│   │   ├── logger.go
│   │   ├── cors.go
│   │   ├── rate_limit.go
│   │   ├── auth.go                  # JWT verification
│   │   ├── rbac.go                  # Permission check
│   │   └── audit.go
│   ├── modules/
│   │   └── v1/
│   │       ├── auth/        (handler.go, service.go, dto.go)
│   │       ├── user/        (handler.go, service.go, repository.go, model.go, dto.go)
│   │       ├── merchant/
│   │       ├── item/        # items + variants
│   │       ├── invoice/     # includes pdf.go and numbering.go
│   │       ├── payment/
│   │       ├── ledger/
│   │       ├── dashboard/
│   │       ├── report/
│   │       ├── setting/
│   │       ├── audit/
│   │       ├── backup/
│   │       └── permission/
│   ├── router/
│   │   ├── router.go                # Builds the Gin engine
│   │   ├── v1.go                    # Registers /api/v1 routes
│   │   └── v2.go                    # Placeholder for V2
│   └── tax/
│       └── gst.go                   # Pure GST calculation (easy to unit test)
├── migrations/                      # SQL files
├── scripts/
│   ├── seed_admin.go
│   └── backup.sh
├── Dockerfile
├── go.mod
├── go.sum
└── Makefile
```

## 3. Module Convention

Every module follows the same five files:

| File | Content |
|------|---------|
| `model.go` | GORM struct matching the table |
| `dto.go` | Request and response structs with validation tags |
| `repository.go` | Interface plus GORM implementation |
| `service.go` | Business logic; accepts repository interfaces |
| `handler.go` | Gin handlers; calls the service |

Each module exposes one function: `Register(rg *gin.RouterGroup, deps Deps)`.

## 4. Starter Code

### 4.1 main.go

```go
package main

import (
	"log/slog"
	"os"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/platform/cache"
	"patwatoli-erp/internal/platform/database"
	"patwatoli-erp/internal/router"
)

func main() {
	cfg := config.Load()

	db, err := database.NewPostgres(cfg.DatabaseURL)
	if err != nil {
		slog.Error("database connection failed", "error", err)
		os.Exit(1)
	}

	// Redis is optional: the API must still work without it.
	rdb := cache.NewRedis(cfg.RedisURL)

	r := router.New(cfg, db, rdb)

	slog.Info("server starting", "port", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
```

### 4.2 config.go

```go
package config

import "os"

type Config struct {
	Env           string
	Port          string
	DatabaseURL   string
	RedisURL      string
	JWTSecret     string
	AccessTTLMin  int
	RefreshTTLDay int
	AllowedOrigin string
}

func Load() Config {
	return Config{
		Env:           get("APP_ENV", "development"),
		Port:          get("PORT", "8080"),
		DatabaseURL:   mustGet("DATABASE_URL"),
		RedisURL:      get("REDIS_URL", ""),
		JWTSecret:     mustGet("JWT_SECRET"),
		AccessTTLMin:  15,
		RefreshTTLDay: 7,
		AllowedOrigin: get("ALLOWED_ORIGIN", "http://localhost:3000"),
	}
}

func get(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustGet(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic("missing required env var: " + key)
	}
	return v
}
```

### 4.3 database/postgres.go

```go
package database

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func NewPostgres(dsn string) (*gorm.DB, error) {
	// The postgres driver for GORM uses pgx v5 internally.
	return gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:                 logger.Default.LogMode(logger.Warn),
		SkipDefaultTransaction: true, // we manage transactions explicitly
	})
}
```

### 4.4 router/router.go and v1.go

```go
package router

import (
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/middleware"
)

func New(cfg config.Config, db *gorm.DB, rdb *redis.Client) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(
		gin.Recovery(),
		middleware.RequestID(),
		middleware.Logger(),
		middleware.CORS(cfg.AllowedOrigin),
	)

	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

	registerV1(r.Group("/api/v1"), cfg, db, rdb)
	registerV2(r.Group("/api/v2"), cfg, db, rdb) // empty until V2

	return r
}
```

```go
package router

import (
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"patwatoli-erp/internal/config"
	"patwatoli-erp/internal/middleware"
	"patwatoli-erp/internal/modules/v1/auth"
	"patwatoli-erp/internal/modules/v1/invoice"
	"patwatoli-erp/internal/modules/v1/merchant"
)

func registerV1(rg *gin.RouterGroup, cfg config.Config, db *gorm.DB, rdb *redis.Client) {
	// Public routes
	auth.Register(rg.Group("/auth"), auth.Deps{DB: db, Cfg: cfg, Redis: rdb})

	// Protected routes
	protected := rg.Group("")
	protected.Use(middleware.Auth(cfg.JWTSecret, rdb))

	merchant.Register(
		protected.Group("/merchants", middleware.RBAC(db, "merchants")),
		merchant.Deps{DB: db},
	)
	invoice.Register(
		protected.Group("/invoices", middleware.RBAC(db, "invoices")),
		invoice.Deps{DB: db},
	)
	// ...item, payment, ledger, dashboard, report, setting, audit, backup
}
```

### 4.5 GST helper (pure function)

```go
package tax

import "github.com/shopspring/decimal"

type GST struct {
	Taxable decimal.Decimal
	CGST    decimal.Decimal
	SGST    decimal.Decimal
	Total   decimal.Decimal
}

// Calculate splits GST into CGST and SGST.
// cgstRate and sgstRate are percentages, e.g. 2.5.
func Calculate(taxable, cgstRate, sgstRate decimal.Decimal) GST {
	hundred := decimal.NewFromInt(100)
	cgst := taxable.Mul(cgstRate).Div(hundred).Round(2)
	sgst := taxable.Mul(sgstRate).Div(hundred).Round(2)
	return GST{
		Taxable: taxable,
		CGST:    cgst,
		SGST:    sgst,
		Total:   taxable.Add(cgst).Add(sgst),
	}
}
```

### 4.6 Invoice service (transaction pattern)

```go
package invoice

import (
	"context"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Service struct {
	db *gorm.DB
}

func (s *Service) Create(ctx context.Context, userID string, in CreateInvoiceRequest) (*InvoiceResponse, error) {
	var result *InvoiceResponse

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Load merchant and variants, compute line amounts and GST
		// 2. Generate invoice number (locks the settings row)
		// 3. Insert invoice and invoice_items

		// 4. Lock the merchant's latest ledger row, then append a debit entry
		var last LedgerEntry
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("merchant_id = ?", in.MerchantID).
			Order("created_at DESC, id DESC").
			Limit(1).
			Find(&last).Error
		if err != nil {
			return err
		}

		// newBalance = last.Balance + invoice.TotalAmount
		// tx.Create(&LedgerEntry{...Debit: total, Balance: newBalance})

		// 5. Write audit log (same transaction)
		return nil
	})

	return result, err
}
```

### 4.7 RBAC middleware

```go
package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var methodToColumn = map[string]string{
	http.MethodPost:   "can_create",
	http.MethodGet:    "can_read",
	http.MethodPut:    "can_update",
	http.MethodPatch:  "can_update",
	http.MethodDelete: "can_delete",
}

func RBAC(db *gorm.DB, module string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("role") // set by Auth middleware
		column, ok := methodToColumn[c.Request.Method]
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"success": false})
			return
		}

		var allowed bool
		err := db.Raw(
			"SELECT "+column+" FROM permissions WHERE role = ? AND module = ?",
			role, module,
		).Scan(&allowed).Error

		if err != nil || !allowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   gin.H{"code": "FORBIDDEN", "message": "You do not have permission"},
			})
			return
		}
		c.Next()
	}
}
```

> The `column` value comes from a fixed map, never from user input, so the string concatenation is safe.

## 5. Adding a V2 Module (Example: Supplier)

1. Create `internal/modules/v2/supplier/` with the five standard files.
2. Continue the migration sequence after `000008` with `000009_create_suppliers.up.sql` and `.down.sql`.
3. In `router/v2.go`:
```go
   func registerV2(rg *gin.RouterGroup, cfg config.Config, db *gorm.DB, rdb *redis.Client) {
       protected := rg.Group("")
       protected.Use(middleware.Auth(cfg.JWTSecret, rdb))
       supplier.Register(protected.Group("/suppliers", middleware.RBAC(db, "suppliers")), supplier.Deps{DB: db})
   }
```
4. Insert default permissions for module `suppliers`.

No V1 file changes except the router registration.

## 6. Coding Rules

| Rule | Detail |
|------|--------|
| Money | Use `shopspring/decimal`, never `float64` |
| Errors | Return `apperror.New(code, message)`; handlers convert to the standard envelope |
| Context | Pass `context.Context` from the handler down to the repository |
| Transactions | Opened in the service layer only |
| Naming | Packages are lowercase singular (`invoice`, not `invoices`) |
| Tests | Place `_test.go` next to the file under test |
| Linting | `golangci-lint run` before each commit |

## 7. Makefile Targets

```makefile
run:        ## Run the API locally
	go run ./cmd/api

test:       ## Run all tests
	go test ./... -race -cover

lint:
	golangci-lint run

migrate-up:
	migrate -path migrations -database "$$DATABASE_URL" up

migrate-down:
	migrate -path migrations -database "$$DATABASE_URL" down 1

build:
	CGO_ENABLED=0 go build -o bin/api ./cmd/api
```

## 8. Testing Strategy

The project progress tracker currently lists GST arithmetic and invoice-lifecycle integration tests. The test types and coverage requirements below are the target strategy; they do not imply that every module or endpoint already has tests.

| Test Type | Scope | Tools |
| --- | --- | --- |
| Unit Tests | Pure functions (GST calculation, invoice numbering, balance calc) | Go `testing`, `testify`<br> |
| Integration Tests | Repository + Service with test DB | `testcontainers-go`, Docker |
| E2E Tests | API endpoints (auth, CRUD, cancel invoice) | `net/http/httptest`, `testify` |
| Test DB | Separate test database, migrations run before tests | Docker Compose |

#### Rules

* Every service method must have at least 1 unit test.
* Every API endpoint must have at least 1 E2E test.
* Run all tests with `go test ./... -race -cover`.


* Use `testify/assert` for test assertions.
* Mock external components (Redis, third-party APIs) using Go interfaces.

---

## 9. CancelInvoice Service Method (UPDATED)

> **Update (2026-10-09):** Added invoice cancel service method to handle status updates, ledger reversal, and audit logging.

```go
func (s *Service) CancelInvoice(ctx context.Context, userID, invoiceID, reason string) (*InvoiceResponse, error) {
	var result *InvoiceResponse
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Lock invoice SELECT ... FOR UPDATE, check status == 'active'
		// 2. UPDATE status='cancelled', cancelled_at=now(), cancel_reason=reason
		// 3. Lock latest ledger row for merchant (SELECT ... FOR UPDATE)
		// 4. INSERT reversing ledger entry (credit, transaction_type='invoice_cancel')
		// 5. INSERT audit_logs row (action='update', module='invoices')
		return nil
	})
	return result, err
}

```