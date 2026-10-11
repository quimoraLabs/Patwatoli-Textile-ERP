# Patwatoli Textile ERP (पटवाटोली टेक्सटाइल ईआरपी)

> **Modular Monolith ERP System** purpose-built for finished goods, size-wise pricing, merchants (व्यापारी), billing, payments, and Khaata ledger management in Patwatoli, Gaya, Bihar.

---

## 🚀 Quick Start (1-Click Run)

To start the complete system (PostgreSQL 18, Redis 7, Go Backend API, and Next.js 15 Web App) in one command:

### Option 1: Windows Batch (Recommended)
Double-click `start.bat` or run in terminal:
```bat
.\start.bat
```

### Option 2: PowerShell
```powershell
.\start.ps1
```

### Option 3: npm
```bash
npm start
```

---

## 🌐 Default Access & URLs

| Service | URL | Purpose |
| :--- | :--- | :--- |
| **Web Frontend** | [http://localhost:3000](http://localhost:3000) | Next.js 15 App Router Web App |
| **Backend API** | [http://localhost:8080/api/v1](http://localhost:8080/api/v1) | Go REST API Service |
| **Health Check** | [http://localhost:8080/health](http://localhost:8080/health) | API & DB Liveness Probe |
| **Super Admin Login** | `owner@patwatoli.example` / `S3cure#Pass` | Full administrative access |

---

## 📦 Project Architecture

```
patwatoli-textile-erp/
├── backend/                 # Go 1.24+ Gin API (Modular Monolith)
│   ├── cmd/api/             # API entrypoint
│   ├── internal/
│   │   ├── modules/v1/      # 12 Business modules (auth, invoice, merchant, ledger, etc.)
│   │   ├── middleware/      # Auth, RBAC, RateLimit, Audit logging
│   │   ├── platform/        # Postgres, Redis, Response envelopes
│   │   └── tax/             # Exact 2-decimal rounded GST math
│   ├── migrations/          # 8 PostgreSQL migrations
│   └── scripts/             # Admin & demo data seeding
├── frontend/                # Next.js 15 App Router + Tailwind CSS
│   ├── src/app/             # Pages: Dashboard, Invoices, Party/Khaata, Reports, Admin
│   ├── src/components/      # UI & layout components
│   └── src/lib/             # Typed API client
├── docs/                    # Architecture, API contract, and Schema specs
├── docker-compose.yml       # PostgreSQL 18 & Redis 7
├── start.bat                # 1-click Windows batch launcher
├── start.ps1                # 1-click PowerShell launcher
└── package.json             # Root monorepo scripts
```

---

## 🛠️ Useful Commands

```bash
# 1. Start Docker containers
npm run docker:up

# 2. Seed Super Admin & Realistic Demo Textile Data
npm run seed

# 3. Run Backend API directly
npm run backend:dev

# 4. Run Backend Tests (Exact GST math & Invoice lifecycle)
npm run backend:test

# 5. Run Frontend directly
npm run frontend:dev

# 6. Build Frontend for Production
npm run frontend:build
```
