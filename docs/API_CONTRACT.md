# API Contract (v1)

## Purpose
This document defines every V1 endpoint with request and response examples. All endpoints use the prefix `/api/v1/`. The frontend and backend must both follow this contract.

---

## 1. Conventions

| Topic | Rule |
|-------|------|
| Base URL (local) | `http://localhost:8080/api/v1` |
| Format | JSON, UTF-8 |
| Auth | `Authorization: Bearer <access_token>` on all routes except login/refresh |
| IDs | UUIDv7 strings |
| Money | Decimal strings, e.g. `"12500.00"` |
| Dates | `YYYY-MM-DD`; timestamps in ISO 8601 UTC |
| Pagination | `?page=1&limit=20` (max limit 100) |
| Sorting | `?sort=-created_at` (prefix `-` for descending) |

### Success envelope
```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 134 }
}
```
`meta` appears only on list endpoints.

### Error envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "items[0].qty", "message": "must be greater than 0" }
    ]
  }
}
```

### Error codes

| HTTP | code | Meaning |
|------|------|---------|
| 400 | VALIDATION_ERROR | Bad input |
| 401 | UNAUTHORIZED | Missing/expired token |
| 403 | FORBIDDEN | Role lacks permission |
| 404 | NOT_FOUND | Record not found |
| 409 | CONFLICT | Duplicate or constraint violation |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Unexpected error |

## 2. Endpoint Summary

| Module | Method | Path | Permission |
|--------|--------|------|-----------|
| Health | GET | /health | Public |
| Auth | POST | /auth/login | Public |
| Auth | POST | /auth/refresh | Public (refresh token) |
| Auth | POST | /auth/logout | Any logged-in |
| Auth | GET | /auth/me | Any logged-in |
| Auth | PUT | /auth/change-password | Any logged-in |
| Users | GET | /users | users:read |
| Users | POST | /users | users:create |
| Users | GET | /users/:id | users:read |
| Users | PUT | /users/:id | users:update |
| Users | DELETE | /users/:id | users:delete |
| Merchants | GET | /merchants | merchants:read |
| Merchants | POST | /merchants | merchants:create |
| Merchants | GET | /merchants/:id | merchants:read |
| Merchants | PUT | /merchants/:id | merchants:update |
| Merchants | DELETE | /merchants/:id | merchants:delete |
| Items | GET | /items | items:read |
| Items | POST | /items | items:create |
| Items | GET | /items/:id | items:read |
| Items | PUT | /items/:id | items:update |
| Items | DELETE | /items/:id | items:delete |
| Variants | POST | /items/:id/variants | items:create |
| Variants | PUT | /variants/:id | items:update |
| Variants | DELETE | /variants/:id | items:delete |
| Invoices | GET | /invoices | invoices:read |
| Invoices | POST | /invoices | invoices:create |
| Invoices | GET | /invoices/:id | invoices:read |
| Invoices | GET | /invoices/:id/pdf | invoices:read |
| Invoices | POST | /invoices/:id/cancel | invoices:update |
| Payments | GET | /payments | payments:read |
| Payments | POST | /payments | payments:create |
| Ledger | GET | /merchants/:id/ledger | ledger:read |
| Dashboard | GET | /dashboard | dashboard:read |
| Reports | GET | /reports/sales, /merchant-wise, /item-wise, /gst | reports:read |
| Settings | GET | /settings | settings:read |
| Settings | PUT | /settings | settings:update |
| Audit | GET | /audit-logs | audit:read |
| Backups | GET | /backups | backups:read |
| Backups | POST | /backups | backups:create |
| Backups | GET | /backups/:id/download | backups:read |

Permission identifiers use the form `module:action`. The action maps to the HTTP method: GET → `read`, POST → `create`, PUT/PATCH → `update`, and DELETE → `delete`. The backend middleware receives the module name and derives the action from the request method.

## 3. Auth

### POST /auth/login
Request:
```json
{ "email": "owner@patwatoli.example", "password": "S3cure#Pass" }
```
Response `200`:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900,
    "user": {
      "id": "0192f5c8-7b1a-7c3e-9a10-1d2e3f4a5b6c",
      "name": "Owner",
      "email": "owner@patwatoli.example",
      "role": "super_admin"
    }
  }
}
```

### POST /auth/refresh
Request: `{ "refresh_token": "eyJ..." }`
Response `200`: new `access_token` and `refresh_token` (refresh token rotation).

### GET /auth/me
Response `200`:
```json
{
  "success": true,
  "data": {
    "id": "0192f5c8-7b1a-7c3e-9a10-1d2e3f4a5b6c",
    "name": "Owner",
    "role": "super_admin",
    "permissions": {
      "invoices": { "create": true, "read": true, "update": true, "delete": true }
    }
  }
}
```

## 4. Users

### POST /users
Request:
```json
{
  "name": "Accountant One",
  "email": "accounts@patwatoli.example",
  "phone": "9876543210",
  "password": "Temp#12345",
  "role": "accountant"
}
```
Response `201`:
```json
{
  "success": true,
  "data": {
    "id": "0192f5d0-1111-7aaa-bbbb-ccccddddeeee",
    "name": "Accountant One",
    "email": "accounts@patwatoli.example",
    "phone": "9876543210",
    "role": "accountant",
    "is_active": true,
    "created_at": "2026-10-09T10:30:00Z"
  }
}
```

### GET /users?page=1&limit=20&role=accountant&is_active=true
Returns list of the same user objects with `meta`.

## 5. Merchants (व्यापारी)

### POST /merchants
Request:
```json
{
  "name": "Sharma Garments",
  "phone": "9811122233",
  "address": "Main Market, Gaya, Bihar",
  "gstin": "10ABCDE1234F1Z5"
}
```
Response `201`:
```json
{
  "success": true,
  "data": {
    "id": "0192f5d1-2222-7aaa-bbbb-ccccddddeeee",
    "name": "Sharma Garments",
    "phone": "9811122233",
    "address": "Main Market, Gaya, Bihar",
    "gstin": "10ABCDE1234F1Z5",
    "balance": "0.00",
    "created_at": "2026-10-09T10:35:00Z"
  }
}
```

### GET /merchants?search=sharma
List with current `balance` included on each row.

## 6. Items and Variants

### POST /items
Request:
```json
{ "name": "Cotton Vest", "unit": "chauka" }
```
Allowed `unit`: `chauka`, `jod`, `piece`, `meter`.

### POST /items/:id/variants
Request:
```json
{ "size": "AA", "rate": "145.00" }
```
Allowed `size`: `A`, `AA`, `AAA`, `K1`, `K2`, `K3`.

### GET /items/:id
Response `200`:
```json
{
  "success": true,
  "data": {
    "id": "0192f5d2-3333-7aaa-bbbb-ccccddddeeee",
    "name": "Cotton Vest",
    "unit": "chauka",
    "variants": [
      { "id": "0192f5d2-4444-7aaa-bbbb-ccccddddeeee", "size": "A",  "rate": "130.00" },
      { "id": "0192f5d2-5555-7aaa-bbbb-ccccddddeeee", "size": "AA", "rate": "145.00" }
    ]
  }
}
```

## 7. Invoices

### POST /invoices
Request:
```json
{
  "merchant_id": "0192f5d1-2222-7aaa-bbbb-ccccddddeeee",
  "invoice_date": "2026-10-09",
  "items": [
    { "item_id": "0192f5d2-3333-7aaa-bbbb-ccccddddeeee",
      "variant_id": "0192f5d2-5555-7aaa-bbbb-ccccddddeeee",
      "qty": "50" },
    { "item_id": "0192f5d2-3333-7aaa-bbbb-ccccddddeeee",
      "variant_id": "0192f5d2-4444-7aaa-bbbb-ccccddddeeee",
      "qty": "20" }
  ]
}
```
The server looks up rates and calculates tax. The client never sends rates or totals.

Response `201`:
```json
{
  "success": true,
  "data": {
    "id": "0192f5d3-6666-7aaa-bbbb-ccccddddeeee",
    "invoice_no": "PTX/2026-27/0001",
    "merchant": { "id": "0192f5d1-2222-7aaa-bbbb-ccccddddeeee", "name": "Sharma Garments" },
    "invoice_date": "2026-10-09",
    "items": [
      { "item_name": "Cotton Vest", "size": "AA", "unit": "chauka", "qty": "50.000", "rate": "145.00", "amount": "7250.00" },
      { "item_name": "Cotton Vest", "size": "A",  "unit": "chauka", "qty": "20.000", "rate": "130.00", "amount": "2600.00" }
    ],
    "taxable_amount": "9850.00",
    "cgst": "246.25",
    "sgst": "246.25",
    "total_amount": "10342.50",
    "created_at": "2026-10-09T10:40:00Z"
  }
}
```

### GET /invoices?merchant_id=...&from=2026-10-01&to=2026-10-31&page=1&limit=20
List of invoice summaries.

### GET /invoices/:id/pdf
Returns `application/pdf`. Add `?download=1` to force download.

### POST /invoices/:id/cancel
Request: `{ "reason": "Wrong merchant selected" }`
Effect: creates a reversing ledger entry and marks the invoice cancelled (a `status` column will be added via migration when cancel is implemented).

## 8. Payments

### POST /payments
Request:
```json
{
  "merchant_id": "0192f5d1-2222-7aaa-bbbb-ccccddddeeee",
  "amount": "5000.00",
  "payment_mode": "upi",
  "payment_date": "2026-10-09"
}
```
Response `201`:
```json
{
  "success": true,
  "data": {
    "id": "0192f5d4-7777-7aaa-bbbb-ccccddddeeee",
    "merchant_id": "0192f5d1-2222-7aaa-bbbb-ccccddddeeee",
    "amount": "5000.00",
    "payment_mode": "upi",
    "payment_date": "2026-10-09",
    "new_balance": "5342.50"
  }
}
```

## 9. Ledger (Khaata)

### GET /merchants/:id/ledger?from=2026-10-01&to=2026-10-31
Response `200`:
```json
{
  "success": true,
  "data": {
    "merchant": { "id": "0192f5d1-2222-7aaa-bbbb-ccccddddeeee", "name": "Sharma Garments" },
    "opening_balance": "0.00",
    "entries": [
      { "date": "2026-10-09", "type": "invoice", "ref": "PTX/2026-27/0001",
        "debit": "10342.50", "credit": "0.00", "balance": "10342.50" },
      { "date": "2026-10-09", "type": "payment", "ref": "UPI",
        "debit": "0.00", "credit": "5000.00", "balance": "5342.50" }
    ],
    "closing_balance": "5342.50"
  }
}
```

## 10. Dashboard

### GET /dashboard
```json
{
  "success": true,
  "data": {
    "this_month_income": "125000.00",
    "this_month_sales": "180500.00",
    "total_outstanding": "342000.00",
    "total_advance": "8000.00",
    "top_merchants": [
      { "name": "Sharma Garments", "balance": "5342.50" }
    ],
    "generated_at": "2026-10-09T10:45:00Z"
  }
}
```

## 11. Reports

| Endpoint | Query params | Description |
|----------|-------------|-------------|
| GET /reports/sales | from, to, group_by=day\|month | Sales totals |
| GET /reports/merchant-wise | from, to | Sales and payments per merchant |
| GET /reports/item-wise | from, to | Quantity and amount per item and size |
| GET /reports/gst | month=2026-10 | Taxable, CGST, SGST totals for GST filing |

All report endpoints support `&format=csv` for export.

Example `GET /reports/gst?month=2026-10`:
```json
{
  "success": true,
  "data": {
    "month": "2026-10",
    "invoice_count": 42,
    "taxable_amount": "512000.00",
    "cgst": "12800.00",
    "sgst": "12800.00",
    "total_tax": "25600.00"
  }
}
```

## 12. Settings

### GET /settings
```json
{
  "success": true,
  "data": [
    { "key": "tax.cgst_rate", "value": "2.5", "description": "CGST percent" },
    { "key": "invoice.prefix", "value": "PTX", "description": "Invoice number prefix" }
  ]
}
```

### PUT /settings
Request:
```json
{ "settings": [ { "key": "invoice.prefix", "value": "PTE" } ] }
```

## 13. Audit Logs

### GET /audit-logs?module=invoices&user_id=...&from=2026-10-01&to=2026-10-31
```json
{
  "success": true,
  "data": [
    {
      "id": "0192f5d5-8888-7aaa-bbbb-ccccddddeeee",
      "user": { "id": "0192f5c8-7b1a-7c3e-9a10-1d2e3f4a5b6c", "name": "Owner" },
      "action": "create",
      "module": "invoices",
      "record_id": "0192f5d3-6666-7aaa-bbbb-ccccddddeeee",
      "ip_address": "103.21.10.5",
      "created_at": "2026-10-09T10:40:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

## 14. Backups

### POST /backups
Creates a `pg_dump` file. Response `202`:
```json
{ "success": true, "data": { "id": "0192f5d6-9999-7aaa-bbbb-ccccddddeeee", "status": "running" } }
```

### GET /backups
List of backups with `status`, `size_bytes`, `created_at`.

## 15. Versioning Policy

- Breaking changes go to a new prefix (`/api/v2/`), never into `/api/v1/`.
- Additive changes (new optional fields) are allowed in v1.
- V2 modules (suppliers, labour) will live under `/api/v2/` while V1 routes continue to work.


## 16. Invoice Cancel & Status Updates

#### Updated: POST /invoices/:id/cancel

* **Permission:** `invoices:update` (`super_admin` and `admin` only)
* **Request:**

```json
{
  "reason": "Merchant requested order cancellation due to duplicate entry"
}

```

* **Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "0192f5d3-6666-7aaa-bbbb-ccccddddeeee",
    "invoice_no": "PTX/2026-27/0001",
    "status": "cancelled",
    "cancelled_at": "2026-10-09T11:00:00Z",
    "cancel_reason": "Merchant requested order cancellation due to duplicate entry",
    "ledger_reversal": {
      "ledger_id": "0192f5d7-0000-7aaa-bbbb-ccccddddeeee",
      "transaction_type": "invoice_cancel",
      "credit": "10342.50",
      "new_balance": "0.00"
    }
  }
}

```

* **Error 400:** `{"success": false, "error": {"code": "VALIDATION_ERROR", "message": "Reason is required (5-255 chars)"}}`

* **Error 409:** `{"success": false, "error": {"code": "CONFLICT", "message": "Invoice is already cancelled"}}`


---

#### Updated: GET /invoices

* **Query Params:** `?status=active|cancelled|all` (default: `active`), `?merchant_id=...&from=...&to=...&page=1&limit=20`

* **Response 200 (item excerpt):**

```json
{
  "id": "0192f5d3-6666-7aaa-bbbb-ccccddddeeee",
  "invoice_no": "PTX/2026-27/0001",
  "merchant": { "id": "0192f5d1-2222-7aaa-bbbb-ccccddddeeee", "name": "Sharma Garments" },
  "total_amount": "10342.50",
  "status": "cancelled",
  "cancelled_at": "2026-10-09T11:00:00Z",
  "cancel_reason": "Merchant requested order cancellation due to duplicate entry"
}

```

---

#### Updated: GET /invoices/:id

* **Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "0192f5d3-6666-7aaa-bbbb-ccccddddeeee",
    "invoice_no": "PTX/2026-27/0001",
    "merchant": { "id": "0192f5d1-2222-7aaa-bbbb-ccccddddeeee", "name": "Sharma Garments" },
    "total_amount": "10342.50",
    "status": "cancelled",
    "cancelled_at": "2026-10-09T11:00:00Z",
    "cancel_reason": "Merchant requested order cancellation due to duplicate entry"
  }
}

```

---

#### Updated: POST /invoices

* **Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "0192f5d3-6666-7aaa-bbbb-ccccddddeeee",
    "invoice_no": "PTX/2026-27/0001",
    "total_amount": "10342.50",
    "status": "active",
    "cancelled_at": null,
    "cancel_reason": null
  }
}

```

---

#### Updated: GET /dashboard

* **Behavior:** `this_month_sales` and `total_outstanding` aggregations automatically filter out invoices where `status = 'cancelled'`.

---

#### Updated: GET /reports/*

* **Behavior:** All report endpoints (`/sales`, `/merchant-wise`, `/item-wise`, `/gst`) exclude cancelled invoices. For `/reports/gst`, `invoice_count`, `taxable_amount`, and tax totals represent active invoices only.



---

#### Updated: GET /merchants/:id/ledger

* **Response 200:**

```json
{
  "entries": [
    { "date": "2026-10-09", "type": "invoice", "ref": "PTX/2026-27/0001", "debit": "10342.50", "credit": "0.00", "balance": "10342.50" },
    { "date": "2026-10-09", "type": "invoice_cancel", "ref": "PTX/2026-27/0001", "debit": "0.00", "credit": "10342.50", "balance": "0.00" }
  ]
}

```

---

#### Updated: GET /invoices/:id/pdf

* **Behavior:** If the target invoice has `status = 'cancelled'`, the generated PDF includes a prominent diagonal **"CANCELLED"** watermark overlay across all pages.