# Architecture

## Purpose
This document describes the overall system design, the repository layout, and how data flows through the system for the most important operations.

---

## 1. Architecture Style
A **modular monolith**: one Go API service organised into business modules, one Next.js web app, one PostgreSQL database, one Redis instance. This is the simplest design that still allows V2–V5 modules to be added cleanly.

## 2. High-Level Diagram

```
+----------------------+
|  Browser (Next.js)   |
|  React + Tailwind    |
|  Zustand state       |
+----------+-----------+
           | HTTPS, JSON, Authorization: Bearer <JWT>
           v
+----------------------------------------------+
|                 Go API (Gin)                 |
|                                              |
| Middleware: RequestID -> Logger -> CORS ->   |
|             RateLimit -> Auth -> RBAC -> Audit|
|                                              |
| /api/v1/ auth | users | merchants | items    |
|          invoices | payments | ledger        |
|          dashboard | reports | settings      |
|          audit-logs | backups                |
| /api/v2/ (suppliers, labour - future)        |
|                                              |
| Layers: Handler -> Service -> Repository     |
+--------------+-----------------+-------------+
               | pgx v5 / GORM  | go-redis
               v                v
+--------------------+  +----------------+
|  PostgreSQL 18     |  |   Redis 7      |
|  (system of        |  | cache, rate    |
|   record)          |  | limit, JWT     |
+--------------------+  | blacklist      |
                        +----------------+
```

## 3. Layered Design (Backend)

| Layer | Responsibility | Must not |
|-------|---------------|----------|
| Handler | Parse request, validate input, call service, return JSON | Contain business logic or SQL |
| Service | Business rules, transactions, GST calculation, ledger logic | Know about HTTP |
| Repository | Database access via GORM/pgx | Contain business rules |
| Model/DTO | Data structures | Contain behaviour beyond simple helpers |

Dependency direction is always **handler → service → repository**.

## 4. Repository Layout (Monorepo)

```
patwatoli-textile-erp/
|-- backend/                 # Go API (see BACKEND_STRUCTURE.md)
|-- frontend/                # Next.js app (see FRONTEND_STRUCTURE.md)
|-- docs/                    # These markdown files
|-- deploy/
|   |-- docker/              # Dockerfiles
|   `-- render.yaml          # Render blueprint
|-- docker-compose.yml
|-- .env.example
|-- Makefile
`-- README.md
```

## 5. Key Data Flows

### 5.1 Login
```
Browser -> POST /api/v1/auth/login {email, password}
  API: find user -> verify bcrypt hash -> check is_active
  API: issue access token (15 min) + refresh token (7 days)
  API: update users.last_login, write audit log
Browser <- 200 {access_token, refresh_token, user}
```

### 5.2 Create Invoice (most important flow)
```
Browser -> POST /api/v1/invoices {merchant_id, invoice_date, items[]}
  Middleware: Auth -> RBAC (module=invoices, action=create)
  Service (single DB transaction):
    1. Load merchant; load each variant and its current rate
    2. Compute line amount = qty x rate
    3. taxable_amount = sum(line amounts)
    4. cgst = taxable x 2.5%, sgst = taxable x 2.5% (rates from settings)
    5. Generate invoice_no (prefix from settings, e.g. PTX/2026-27/0001)
    6. INSERT invoices, INSERT invoice_items
    7. INSERT ledger row: debit = total_amount, balance updated
    8. INSERT audit_logs row
  Commit
Browser <- 201 {invoice}
```

### 5.3 Record Payment
```
Browser -> POST /api/v1/payments {merchant_id, amount, payment_mode, payment_date}
  Service (single DB transaction):
    1. INSERT payments
    2. INSERT ledger row: credit = amount, balance recalculated
    3. INSERT audit_logs row
Browser <- 201 {payment}
```

### 5.4 Dashboard
```
Browser -> GET /api/v1/dashboard
  Service: check Redis key dashboard:summary (TTL 60s)
    hit  -> return cached
    miss -> run 3 aggregate queries -> cache -> return
```

## 6. Ledger Balance Rule

For each merchant, balance = previous balance + debit - credit.

- Positive balance = merchant owes you (**Outstanding**)
- Negative balance = merchant has paid extra (**Advance**)

To avoid wrong balances under concurrent writes, the service locks the merchant's latest ledger row (`SELECT ... FOR UPDATE`) inside the transaction before inserting a new entry.

## 7. Cross-Cutting Concerns

| Concern | Approach |
|---------|----------|
| Auth | JWT access + refresh (see BACKEND_STRUCTURE.md) |
| Authorisation | Role + module + action matrix from `permissions` table |
| Audit | Middleware/service helper writes `audit_logs` with old and new JSON |
| Validation | `go-playground/validator` on request DTOs |
| Errors | One standard error envelope (see API_CONTRACT.md) |
| Logging | Structured JSON logs (`slog`) with request ID |
| Config | Environment variables loaded once at startup |
| Migrations | SQL files run with `golang-migrate` |
| Time zone | Stored as `timestamptz` (UTC), displayed in `Asia/Kolkata` |

## 8. Extensibility for V2+

Each business area is a self-contained module under `internal/modules/<name>`. Adding suppliers in V2 means:

1. Add `internal/modules/supplier/` with handler, service, repository.
2. Add SQL migration files for new tables.
3. Register routes under `/api/v2/` in one new router file.

No V1 module needs to change. See `BACKEND_STRUCTURE.md`.

## 9. Render Free-Tier Considerations

| Limitation | Design response |
|-----------|-----------------|
| Service sleeps after 15 min idle | Frontend shows a "Waking up server..." state; first request may take ~30-60 s |
| Free PostgreSQL expires after 30 days | Use only for testing; automated `pg_dump` backups; plan managed Indian DB for real use |
| Redis availability | Redis is optional for correctness; the API falls back to no cache if Redis is unreachable |

## 10. Technology Decisions Log

| Decision | Reason |
|----------|--------|
| Monolith, not microservices | One developer, one business, simpler ops |
| GORM + pgx v5 | GORM for productivity, pgx driver for performance and native PG types |
| UUIDv7 primary keys | Time-ordered, index-friendly, no need to expose sequential IDs |
| Redis for cache only | Keeps PostgreSQL as the single source of truth |
| Zustand over Redux | Minimal boilerplate for a small app |

## 11. Security Architecture

| Concern | Approach |
| --- | --- |
| JWT Strategy | JWT access token (15 min) + refresh token (7 days)
| Password Hashing | bcrypt with cost factor 12
| RBAC | Role + module + action matrix from `permissions` table
| Rate Limiting | Redis-based, 100 req/min per IP
| Input Validation | `go-playground/validator` on request DTOs
| HTTPS/TLS | Enforced in production (Render + Vercel auto SSL)
| CORS | Restricted to allowed origins (Vercel frontend URL)
| Audit Logging | Every create/update/delete writes to `audit_logs`<br> |
| SQL Injection | GORM parameterized queries, no raw string concatenation
| XSS Prevention | React auto-escapes, no `dangerouslySetInnerHTML` |
| CSRF Prevention | JWT in `Authorization` header (not cookies)
