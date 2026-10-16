# Development and Deployment Guide

## 1. Executive Summary & Infrastructure Architecture

This guide details the end-to-end deployment strategy for **Patwatoli Textile ERP**. The infrastructure is designed to run efficiently within free-tier cloud limits during initial testing while ensuring seamless migration to production-grade managed infrastructure.

```
                    ┌────────────────────────────────────────┐
                    │            Vercel Platform             │
                    │         Next.js 15 App Router          │
                    └───────────────────┬────────────────────┘
                                        │ HTTPS / REST API
                                        ▼
                    ┌────────────────────────────────────────┐
                    │              Render.com                │
                    │        Go Backend (Gin Engine)         │
                    └───────────┬────────────────┬───────────┘
                                │                │
                      GORM / pgx│                │ Cache / Session
                                ▼                ▼
                    ┌──────────────────┐  ┌──────────────────┐
                    │ PostgreSQL 18 DB │  │   Redis 7 DB     │
                    └──────────────────┘  └──────────────────┘

```

---

## 2. Environment Setup & Configuration

Configuration is managed strictly through separated environment files to ensure local test data never corrupts live production databases on Render and Vercel.

- **Backend (Render / Local):**
  - Local Dev: `backend/.env.local` (Local Docker DB, `sslmode=disable`, ignored by git)
  - Production Template: `backend/.env.example` (Set in Render Dashboard, `sslmode=require`)
- **Frontend (Vercel / Local):**
  - Local Dev: `frontend/.env.local` (Connects to `http://localhost:8080/api/v1`, ignored by git)
  - Production Template: `frontend/.env.example` (Set in Vercel Dashboard -> Environment Variables)

### Component Configuration Table

| Environment Variable | Description | Deployment Target | Secret / Public |
| --- | --- | --- | --- |
| `APP_ENV` | Application environment (`development` / `production`) | Render Web Service | Secret |
| `PORT` | Go Application HTTP Listening Port (Default: `8080`) | Render Web Service | Secret |
| `DATABASE_URL` | PostgreSQL Connection String (`sslmode=require` on Render) | Render Web Service | Secret |
| `REDIS_URL` | Redis Connection String (Optional, runs safely without it) | Render Web Service | Secret |
| `JWT_SECRET` | Secret key for signing Access Tokens (min 32 chars) | Render Web Service | Secret |
| `ALLOWED_ORIGIN` | Allowed Frontend Domain(s) (e.g. `https://your-app.vercel.app`) | Render Web Service | Secret |
| `NEXT_PUBLIC_API_BASE_URL` | Live Backend API Root Path (`https://...onrender.com/api/v1`) | Vercel Frontend | Public |
| `NEXT_PUBLIC_APP_NAME` | Display application title | Vercel Frontend | Public |

---

## 3. Local Setup with Docker Compose

Run the complete stack locally using Docker Compose for local development and testing.

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: erp_user
      POSTGRES_PASSWORD: erp_password
      POSTGRES_DB: textile_erp
    ports:
      - "5432:5432"
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://erp_user:erp_password@postgres:5432/textile_erp?sslmode=disable
      REDIS_URL: redis:6379

```

---

## 4. Environment Variables (.env.example)

```env
# Backend Environment Settings (.env)
PORT=8080
ENV=development
DATABASE_URL=postgres://erp_user:erp_password@localhost:5432/textile_erp?sslmode=disable
REDIS_URL=localhost:6379
JWT_SECRET=super-secret-jwt-key-patwatoli-2026
CORS_ORIGINS=http://localhost:3000

# Frontend Settings (.env.local)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_APP_NAME=Patwatoli Textile ERP

```

---

## 5. Docker Containers (Backend & Frontend)

### 5.1 Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/api

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]

```

### 5.2 Frontend Dockerfile (`frontend/Dockerfile`)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]

```

---

## 6. Running Migrations

Database schema migrations run automatically on backend application startup using GORM auto-migrations or CLI migration tools.

```bash
# Executing manual migrations via CLI tool
$ golang-migrate -path ./migrations -database "${DATABASE_URL}" up

# Checking migration status
$ golang-migrate -path ./migrations -database "${DATABASE_URL}" version

```

---

## 7. Seeding First Super Admin

Seed the default super administrator account using an SQL script or Go CLI utility.

```sql
INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Super Admin',
    'admin@patwatoli-erp.com',
    '$2a$12$K8xW9Z1vL9qR1eT0u2X3y.pG7hJ8k9L0m1N2o3P4q5R6s7T8u9V0w', -- bcrypt hash
    'super_admin',
    'ACTIVE',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

```

---

## 8. Render Free-Tier Deployment Strategy

### Service Setup

1. **Web Service (Go API):** Connect GitHub repo; select Go environment; build command `go build -o server ./cmd/api`; start command `./server`.
2. **Free PostgreSQL:** Provision managed PostgreSQL 18 instance on Render; copy internal connection string to `DATABASE_URL`.
3. **Free Redis:** Provision Key-Value store instance on Render; copy internal connection string to `REDIS_URL`.

### Render Free-Tier Optimization Strategy

* **Cold Starts:** Free web instances sleep after 15 minutes of inactivity. Frontend handles 30-second initial wake-up delay gracefully.
* **Database Expiry:** Free Render PostgreSQL databases expire after 30 days. Automated SQL dumps are scheduled weekly to maintain data persistence.
* **Keep-Alive Ping:** Internal cron jobs ping `/health` endpoint during working hours (8:00 AM – 8:00 PM IST) to reduce spinning delay.

---

## 9. Render Free-Tier Warnings & Constraints

| Limitation / Threat | Impact Level | Mitigation Strategy |
| --- | --- | --- |
| **Instance Inactivity Sleep** | High (15–30s delay) | Warm-up banner on Next.js UI + scheduled health ping during business hours |
| **30-Day Database Expiry** | Critical (Data Loss) | Weekly automated pg_dump back ups stored off-site |
| **512 MB RAM Ceiling** | Medium (OOM Crash) | Restrict Go memory allocation, disable heavy in-memory caching |
| **Single Region (Oregon/Frankfurt)** | Low (Latency ~180ms) | Low overall impact for async back-office ERP workflows |

---

## 10. Vercel Frontend Setup

1. **Repository Link:** Import the GitHub project repo into Vercel dashboard.
2. **Framework Preset:** Select **Next.js**. Set Root Directory to `frontend`.
3. **Environment Variables:** Define `NEXT_PUBLIC_API_BASE_URL` pointing to the live Render backend service (`[https://patwatoli-erp-api.onrender.com/api/v1](https://patwatoli-erp-api.onrender.com/api/v1)`).
4. **Build Settings:** Default build command (`next build`) and output directory (`.next`).
5. **Domain Binding:** Attach custom domain or use free `.vercel.app` domain.

---

## 11. Database Backup & Disaster Recovery

### Automated Backup Workflow

```
┌─────────────────┐       pg_dump       ┌─────────────────┐       Encrypted       ┌─────────────────┐
│ Render Postgres ├────────────────────►│ Go Cron Worker  ├──────────────────────►│ Cloud Storage   │
└─────────────────┘                     └─────────────────┘                       └─────────────────┘

```

* **Backup Format:** Plain text SQL (`pg_dump -Fp`) and compressed custom binaries (`-Fc`).
* **Retention Policy:** Daily snapshots retained for 7 days; monthly snapshots retained for 12 months.
* **Restoration Procedure:** Command line import via `psql -h <host> -U <user> -d <database> < backup.sql`.

---

## 12. Future Provision: India-Based Managed DB (Yotta / Wahda Cloud)

To minimize latency and comply with local data residency preferences, the system supports seamless migration from Render to domestic Indian cloud providers:

* **Target Cloud Providers:** Yotta Data Services (Navi Mumbai / Greater Noida) or Wahda Cloud (India Datacenters).
* **Expected Benefits:** Sub-30ms ping latency across Bihar and pan-India regions.
* **Migration Plan:** Update connection strings in target environment variables; no application code changes required due to standard PostgreSQL compatibility.

---

## 13. Production Deployment Checklist

* [ ] All database environment secrets (`DATABASE_URL`, `JWT_SECRET`) securely configured.
* [ ] Initial Super Admin account seeded and default credentials updated.
* [ ] CORS policies explicitly restricted to production frontend domain.
* [ ] Database indices created for primary query paths (Invoices, Ledger, Yarn Stock).
* [ ] SSL/TLS certificates active across backend and frontend URLs.
* [ ] Automated backup script verified and test restoration completed.
* [ ] Render health-check endpoint returning `200 OK`.
* [ ] Frontend cold-start warning banner verified working.

---

## 14. Troubleshooting & Deployment Matrix

| Symptom / Issue | Possible Root Cause | Resolution Steps |
| --- | --- | --- |
| **`504 Gateway Timeout`** | Render backend instance sleeping | Retry request; allow up to 30s for cold boot |
| **`pq: max connections reached`** | Exhausted DB connection pool | Lower GORM max open connections to max 10 in free tier |
| **`CORS Policy Error`** | Mismatched frontend domain origin | Update `CORS_ORIGINS` in Render environment settings |
| **`DB Connection Refused`** | Database instance expired or reset | Verify connection string; restore latest SQL backup |
| **`Build Failed: OOM`** | RAM limit exceeded during build | Use multi-stage Docker build; prune unused dependencies |