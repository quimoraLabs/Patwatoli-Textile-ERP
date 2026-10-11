# Product Requirements Document

## Patwatoli Textile ERP

| Field | Value |
| --- | --- |
| Product | Patwatoli Textile ERP |
| Initial release | V1 — Core Foundation |
| Status | Product definition; implementation status must be verified separately |
| Primary users | Textile business owner, administrators, accountants, read-only staff |
| Market | Patwatoli, Gaya, Bihar, India |

## 1. Product Summary

Patwatoli Textile ERP is a web-based business system for replacing paper-based sales billing and merchant account books (khaata) in a home-based textile manufacturing and selling business. V1 focuses on finished-goods item and size-wise pricing, merchant records, GST or non-GST invoices, payment recording, merchant ledgers, and essential business reporting.

The product should be straightforward for a small business to operate, preserve accurate financial records, and provide a modular foundation for later supply-chain, labour, inventory, and operations features.

## 2. Problem and Opportunity

The business currently relies on manual paper ledgers and billing. This makes it difficult to consistently calculate taxes, track merchant balances and advances, find transaction history, and produce reports. The product should centralize these workflows and make the digital records dependable enough to compare with the existing paper register during rollout.

## 3. Goals and Non-Goals

### V1 goals

- Create and retrieve GST and non-GST sales invoices with multiple item lines.
- Support finished goods, local textile units, size-grade variants, and variant-specific rates.
- Record merchant payments by cash, bank, or UPI.
- Maintain a transaction-backed ledger for each merchant.
- Show useful business totals, including monthly income, outstanding balances, and advances.
- Provide role-based access, essential settings, audit history, reports, and backup operations.
- Produce printable or downloadable invoice PDFs.

### Out of scope for V1

- Supplier purchasing, raw-material inventory, production, karigar wages, hard labour, and transport operations.
- AI features, bill scanning, forecasting, or advanced accounting such as Sood/Jama.
- Mobile applications, WhatsApp workflows, customer self-service, and offline synchronization.
- Multi-branch support, franchise management, and e-commerce.

These are future-version candidates, not implied V1 commitments. See [docs/ROADMAP.md](./docs/ROADMAP.md).

## 4. Users and Permissions

| Role | Primary needs | V1 access |
| --- | --- | --- |
| Super Admin | Own and configure the business system | All modules, settings, user roles, audit logs, and backups |
| Admin | Operate the business and manage staff | Business modules and user management, but cannot modify the Super Admin |
| Accountant | Record and reconcile sales | Invoices, payments, merchant ledgers, and reports; no user or settings management |
| Viewer | Review business information | Read-only access to explicitly permitted modules |

The backend must enforce permissions; hiding an action in the UI alone is not authorization.

## 5. V1 Functional Requirements

### 5.1 Authentication and access control

- Users can sign in with their account credentials and sign out.
- Authenticated requests are protected and permissions are checked by role, module, and action.
- Users can change their password.
- Administrators can manage eligible user accounts and roles.

### 5.2 Item and variant management

- Authorized users can create, view, update, and manage finished-goods items.
- An item has a name and a business unit such as chauka, jod, piece, or meter.
- An item can have size-grade variants (`A`, `AA`, `AAA`, `K1`, `K2`, `K3`), each with its own rate.
- Invoice line items use the selected variant and a positive quantity.

### 5.3 Merchant management

- Authorized users can maintain merchant identity and contact details, including optional address and GSTIN.
- Users can find merchants and view their invoices, payments, and ledger history.
- The system must preserve an accurate opening or brought-forward balance if opening balances are enabled in the final V1 workflow.

### 5.4 Invoicing

- An authorized user can create an invoice for a merchant with one or more item-variant lines.
- The system calculates line amounts and invoice totals using exact decimal arithmetic.
- The system supports GST and non-GST invoices. Tax rates and invoice numbering are configurable through business settings.
- The documented local GST example is 5% total, split into CGST 2.5% and SGST 2.5%; confirm applicable tax treatment before production use.
- Invoices have unique, human-readable invoice numbers and can be viewed, filtered, and printed or downloaded as PDF.
- Authorized users can cancel an invoice with a recorded reason. Cancellation must be auditable and reverse its ledger effect without erasing financial history.

### 5.5 Payments and merchant ledger

- An authorized user can record a merchant payment with amount, date, and payment mode (cash, bank, or UPI).
- Invoices post debits and payments post credits to the merchant ledger.
- For each merchant, running balance is previous balance + debit - credit.
- A positive balance means the merchant owes the business (outstanding); a negative balance means the merchant has overpaid (advance).
- Ledger updates must remain correct when concurrent transactions affect the same merchant.
- Users can review ledger entries over a date range and obtain a statement suitable for sharing or printing.

### 5.6 Dashboard and reports

- The dashboard summarizes this month's income, outstanding amounts, advances, and relevant sales activity.
- Authorized users can access sales, merchant-wise, item-wise, and GST reporting.
- Report totals must reconcile with the underlying invoice, payment, and ledger records.

### 5.7 Administration, audit, and backup

- Authorized administrators can maintain business settings, including tax and invoice-numbering settings.
- Creates, updates, deletes, and financially significant actions (including cancellation) are recorded in an audit trail with the actor and relevant before/after information.
- Authorized users can view audit history subject to their role.
- Authorized administrators can initiate and inspect database backups and verify restoration procedures operationally.

## 6. Non-Functional Requirements

- **Financial accuracy:** Store money as `NUMERIC(12,2)` and exchange decimal strings in JSON; do not use binary floating-point for money.
- **Data integrity:** Invoice creation, invoice lines, ledger posting, and audit records must commit or roll back together. Apply the same transactional integrity to payments and cancellations.
- **Security:** Hash passwords with bcrypt; use short-lived access tokens and rotating refresh tokens; validate inputs; enforce rate limits and production HTTPS; restrict CORS to approved origins.
- **Authorization:** Apply server-side role and permission checks to every protected operation.
- **Auditability:** Preserve a traceable financial history; do not silently delete or rewrite posted transactions.
- **Reliability:** PostgreSQL is the system of record. Redis may accelerate caching and rate limiting but must not be required for financial correctness.
- **Usability:** Keep common counter workflows simple and usable on typical local business connectivity. Communicate backend wake-up delays clearly where applicable.
- **Performance:** The roadmap targets a response within 200 ms on an active backend connection; define the measurement conditions and endpoint set before treating this as a release gate.
- **Time handling:** Store timestamps in UTC and present dates/times in the `Asia/Kolkata` business timezone.
- **Maintainability:** Use a modular monolith with versioned APIs and separated handler, service, and repository responsibilities.

## 7. Success Criteria and Release Acceptance

V1 is ready for business rollout when:

1. A full month of real invoices can be entered without maintaining a parallel paper billing workflow.
2. Merchant ledger balances reconcile with the paper register, with discrepancies explainable from transaction history.
3. A GST invoice can be generated, printed, and given to a merchant; non-GST billing also works.
4. Dashboard and report totals reconcile with source records.
5. Invoice cancellation reverses the ledger effect while retaining audit and transaction history.
6. Role restrictions are verified for both allowed and denied actions.
7. A database backup has been restored successfully in a test procedure.

The first four criteria align with the V1 success criteria in [docs/PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md); additional criteria make financial integrity and permissions explicit release checks.

## 8. Assumptions, Risks, and Open Decisions

- The initial deployment is for one business/unit and one business timezone.
- The initial currency is INR. Tax behavior, including when CGST/SGST versus other GST treatment applies, must be confirmed with the business's tax advisor before production.
- Invoice numbering format, opening-balance migration, payment correction policy, and cancellation approval rules need confirmation before their detailed workflows are finalized.
- Render free-tier services are suitable for testing only; database expiry and cold starts make them unsuitable as the sole production reliability plan.
- Intermittent connectivity is a known risk, but offline invoicing and background synchronization are outside V1 scope.
- The planning documents describe intended architecture and some roadmap statuses; they do not by themselves prove that features have been implemented or tested.

## 9. Future Releases

- **V2:** Suppliers, purchasing, raw materials, labour, transport, and supplier ledgers.
- **V3:** Bill OCR, assistant, advanced accounting, expenses, and GST exports.
- **V4:** Inventory, production tracking, QR/barcodes, WhatsApp, customer portal, and mobile app.
- **V5:** Multi-branch operations, franchise/agency workflows, B2B commerce, and forecasting.

See [docs/ROADMAP.md](./docs/ROADMAP.md) for the detailed phase plan and risks.

## 10. Related Product and Engineering Documents

- [docs/PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md) — vision, business context, roles, stack, and V1 goals.
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — system design and core data flows.
- [docs/API_CONTRACT.md](./docs/API_CONTRACT.md) — V1 API behavior and endpoint contract.
- [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) — V1 data model and financial rules.
- [docs/FRONTEND_STRUCTURE.md](./docs/FRONTEND_STRUCTURE.md) — frontend layout, routes, and UI conventions.
- [docs/BACKEND_STRUCTURE.md](./docs/BACKEND_STRUCTURE.md) — backend modules, conventions, and testing strategy.
- [docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md) — environment and deployment guidance.
