# Patwatoli Textile ERP — Project Overview

## Purpose
This document explains why the project exists, what it will do, the business it serves, and the technology it uses. Read this first before any other document.

---

## 1. Vision
Patwatoli Textile ERP replaces paper-based accounting (kagaz par hisaab) in a family textile business with a simple, reliable digital system. It starts with billing and ledgers (V1) and grows step by step into supply chain, labour, AI, operations, and scale (V2–V5).

**Guiding principle:** Keep it simple. Build only what the business needs now, but design modules so that future versions plug in without rewrites.

## 2. Business Context

| Item | Detail |
|------|--------|
| Business type | Home-based textile manufacturing and selling |
| Location | Patwatoli, Gaya, Bihar, India |
| Activities | Make garments, sell to Merchants (व्यापारी), buy raw material from Suppliers |
| Workforce | Karigar (skilled tailors/designers), Hard Labour, Transport |
| Current process | Manual, paper ledgers |
| Currency / Tax | INR, GST (5% = CGST 2.5% + SGST 2.5%) |

### Core business terms

| Term | Meaning |
|------|---------|
| Merchant (व्यापारी) | A customer who buys goods in bulk |
| Ledger / Khaata (खाता) | Running account of debit/credit per merchant |
| Karigar (कारीगर) | Skilled worker paid per piece (V2) |
| Jama (जमा) | Credit entry (V3) |
| Sood (सूद) | Interest on outstanding amount (V3) |
| Chauka, Jod, Piece, Meter | Units of sale |

### Size grades
Items are priced by size grade: **A, AA, AAA, K1, K2, K3**. One item can have several variants, each with its own rate.

## 3. Goals and Non-Goals

### Goals (V1)
- Create GST invoices with multiple items and print/download PDF
- Track merchant payments (Cash / Bank / UPI)
- Maintain a correct ledger (Khaata) per merchant
- Show a dashboard: this month's income, outstanding, advance
- Manage users with roles, settings, audit logs, reports, and backups

### Non-Goals (V1)
- Inventory, production, supplier, labour (V2+)
- AI features (V3)
- Mobile app, WhatsApp (V4)
- Multi-branch, e-commerce (V5)

## 4. Users and Roles

| Role | Who | Access |
|------|-----|--------|
| Super Admin | Owner (you) | Everything, including settings, backups, role changes |
| Admin | Brother | All business modules, user management (except Super Admin) |
| Accountant | Hired/trusted person | Invoices, payments, ledger, reports (no user/settings management) |
| Viewer | Read-only staff | Read-only access to allowed modules |

## 5. Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Go, Gin, GORM, pgx v5 | Fast, single binary, easy to deploy |
| Database | PostgreSQL 18 | Native `uuidv7()`, virtual generated columns |
| Cache | Redis 7 | Rate limiting, token blacklist, dashboard cache |
| Frontend | Next.js (React), Tailwind CSS, Zustand | Productive UI, simple global state |
| Local | Docker Compose | One command to start everything |
| Production testing | Render | Free tier for testing |
| Future production | India-based managed DB (Yotta / Wahda Cloud) | Data residency, reliability |

## 6. Version Roadmap Summary

| Version | Theme | Highlights |
|---------|-------|-----------|
| V1 | Foundation | Billing, item master, merchants, ledger, dashboard, admin panel, JWT |
| V2 | Supply chain and labour | Suppliers, purchase invoices, karigar, hard labour, transport trips |
| V3 | AI and accounting | Bill scanner, chatbot, forecasting, JST Khata, P&L, balance sheet |
| V4 | Operations | Inventory, production, orders, barcode/QR, WhatsApp, mobile app |
| V5 | Scale | Multi-branch, franchise, e-commerce, auto purchase orders |

Details are in `ROADMAP.md`.

## 7. Design Principles

1. **Simple first** — no microservices, no message queues, no over-engineering.
2. **Modular monolith** — one Go service, one folder per business module.
3. **Version-wise APIs** — `/api/v1/`, `/api/v2/` so old clients never break.
4. **Money is exact** — `NUMERIC(12,2)` in the database, decimal strings in JSON.
5. **Everything is audited** — every create/update/delete writes an audit log.
6. **Free-tier aware** — works with Render's 15-minute sleep and 30-day DB expiry (see `DEVELOPMENT_GUIDE.md`).

## 8. Success Criteria for V1

- [ ] A full month of real invoices can be entered without paper
- [ ] Merchant ledger balances match the paper register
- [ ] GST invoice PDF can be printed and given to a merchant
- [ ] Dashboard numbers match manual totals
- [ ] Nightly backup is verified by a test restore

## 9. Document Map

| # | File | Topic |
| --- | --- | --- |
| 1 | PROJECT_OVERVIEW.md | Vision, business context, tech stack, dev guide
| 2 | ARCHITECTURE.md | System design, data flow, security architecture
| 3 | DATABASE_SCHEMA.md | Tables, indexes, migrations (with invoice cancel)
| 4 | API_CONTRACT.md | Endpoints, auth flow, errors (with cancel endpoint)
| 5 | BACKEND_STRUCTURE.md | Go layout, auth, testing strategy
| 6 | FRONTEND_STRUCTURE.md | Next.js layout, admin panel, RBAC matrix
| 7 | DEVELOPMENT_GUIDE.md | Docker, Render, Vercel, backups
| 8 | ROADMAP.md | V1–V5 plan, milestones, risks |

## 10. Development Guide

Run backend and frontend locally using Docker Compose or native CLI commands:

```bash
# Local Setup (Docker Compose)
docker-compose up --build -d

# Local Setup (CLI)
cd backend && go run ./cmd/api
cd frontend && npm run dev

```

* **Git Workflow**: Branch naming `feat/<module>`, `fix/<issue>`. PRs require passing lint (`golangci-lint`, `npm run lint`) and unit tests before merging into `main`.
* **Coding Standards**: Go formatted via `gofmt`; standard `slog` JSON logging; Next.js 15 App Router conventions with TypeScript strict mode enabled.

---
