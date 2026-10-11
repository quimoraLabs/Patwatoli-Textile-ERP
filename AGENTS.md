# Project Agent Instructions

## Project context

Patwatoli Textile ERP is planned as a modular-monolith ERP for a textile business in Patwatoli, Gaya, Bihar. V1 is focused on finished-goods items and size variants, merchants, invoicing, payments, ledgers, dashboards, reports, administration, auditing, and backups. Do not implement V2+ features unless the task explicitly asks for them.

Read [PRD.md](./PRD.md) for product scope. Use the relevant design document in [docs/](./docs/) for implementation details:

- System boundaries and data flows: `docs/ARCHITECTURE.md`
- API behavior: `docs/API_CONTRACT.md`
- Database and ledger rules: `docs/DATABASE_SCHEMA.md`
- Go backend: `docs/BACKEND_STRUCTURE.md`
- Next.js frontend: `docs/FRONTEND_STRUCTURE.md`
- Local development and deployment: `docs/DEVELOPMENT_GUIDE.md`
- Phased roadmap: `docs/ROADMAP.md`

If documents conflict, call out the conflict and prefer the user's explicit request. Do not assume planning documents describe existing, implemented behavior; inspect the code and manifests before changing or running anything.

## Product and domain rules

- Keep V1 focused; do not add inventory, purchasing, labour, AI, mobile, offline sync, or multi-branch behavior without an explicit request.
- Keep financial values exact: use decimal-safe representations, never binary floating-point for money.
- Preserve the ledger rule: running balance = previous balance + debit - credit; positive is outstanding and negative is advance.
- Keep invoice, invoice-line, ledger, and audit changes transactionally consistent. Cancellations must preserve history and reverse the financial effect rather than silently deleting posted records.
- Enforce role and permission checks on the server for every protected operation; UI visibility is not a security boundary.
- Treat PostgreSQL as the source of truth. Redis must not be required for financial correctness.
- Store timestamps in UTC and use `Asia/Kolkata` for business-facing time.
- GST rates and invoice numbering are configuration/business decisions; avoid hard-coding assumptions beyond the documented defaults.

## Architecture and implementation conventions

- Preserve the documented modular-monolith architecture: one Go API, one Next.js web app, PostgreSQL, and optional Redis.
- Backend dependency direction is handler → service → repository. Keep HTTP concerns in handlers, business rules in services, and persistence in repositories.
- Keep APIs under their documented version prefix (`/api/v1/` for V1) and preserve the shared success/error response contract.
- Follow existing code, package, naming, formatting, validation, and error-handling patterns. Inspect neighboring files before introducing a new pattern or dependency.
- Prefer targeted changes. Do not invent files, commands, modules, or runtime behavior merely because they appear in a planning example.

## Validation

- Inspect the repository and its package manifests before selecting setup, build, lint, or test commands.
- Run the smallest relevant existing validation for each change and report commands that could not be run.
- For financial, authorization, or cancellation changes, validate the relevant boundary cases and transaction behavior where tests exist.
- Do not claim a feature is complete based only on documentation or a successful build.

## Documentation

- Keep `PRD.md` as the concise product-scope and acceptance reference.
- Update the directly relevant file under `docs/` when implementation or architecture changes make it inaccurate.
- Keep roadmap status and product requirements distinct: planned or in-progress status is not evidence of implementation.
