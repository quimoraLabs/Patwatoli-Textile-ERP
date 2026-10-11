# ROADMAP.md

## 1. Executive Summary & Release Strategy

This roadmap details the phased feature rollout for **Patwatoli Textile ERP**, custom-engineered for textile weaving, merchant trading, and power-loom cluster operations in Patwatoli, Gaya, Bihar.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  V1: Core    │────►│ V2: Supply   │────►│ V3: AI &     │────►│V4: Production│────►│  V5: Scale   │
│  Foundation  │     │    Chain     │     │  Accounting  │     │ & Mobile App │     │ & Enterprise │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘

```

---

## 2. V1 Detailed Breakdown — Core Foundation

Focuses on finished-goods item management, merchant sales, invoicing, payment tracking, and ledger keeping (Khaata).

### V1 Core Features Matrix

| Module | Features & Scope | Target User Roles | Status |
| --- | --- | --- | --- |
| **Auth & RBAC** | JWT authentication, role protection, login/logout, multi-role middleware | All Roles | Completed |
| **Item Master** | Finished goods only (kapde, gamcha, cloth), HSN mapping, size-wise variant pricing (e.g., 36x72 vs 40x80) | Super Admin, Admin | In Progress |
| **Merchant Master** | Buyer profile registry, GSTIN validation, opening balances, payment terms | Super Admin, Admin, Accountant | In Progress |
| **Invoicing Engine** | Sales invoicing (GST/Non-GST), item line breakdown, instant cancellation support | Super Admin, Admin, Accountant | In Progress |
| **Payment & Ledger** | Party payment recording, auto debit/credit posting, downloadable PDF Khaata statement | Super Admin, Admin, Accountant | Planned |
| **Dashboard** | KPI stat cards (daily sales, pending balance), top merchants table | All Roles | Planned |
| **Admin Panel** | User creation, role assignments, basic audit logs, company setup | Super Admin | Planned |

---

## 3. V2 Detailed Breakdown — Supply Chain & Labour

Extends the system upstream to manage yarn suppliers, raw material procurement, and localized labour payments.

### V2 Core Features Matrix

| Module | Features & Scope | Target User Roles | Status |
| --- | --- | --- | --- |
| **Supplier Master** | Yarn suppliers, dye chemical vendors, bank details, credit limits | Super Admin, Admin, Accountant | Planned |
| **Purchase Module** | Purchase orders (PO), yarn inward challans, beam/warp stock entry, purchase bills | Super Admin, Admin, Accountant | Planned |
| **Karigar Labour** | Master weaver (Karigar) ledger, piece-rate wages per meter/gamcha, loom assignment | Super Admin, Admin | Planned |
| **Hard Labour** | Unskilled daily wages (packing, loading, warping, sizing workers), cash voucher posting | Super Admin, Admin, Accountant | Planned |
| **Transport** | Freight charges entry, e-Way bill attachment, auto-adding transport cost to ledger | Super Admin, Admin, Accountant | Planned |
| **Supplier Ledger** | Supplier payment tracking, age-wise payable reports, pending bill clearance | Super Admin, Admin, Accountant | Planned |

---

## 4. V3 Detailed Breakdown — AI & Advanced Accounting

Introduces automated bill processing, localized accounting practices (Jama, Sood, Tax), and automated GST reporting.

### V3 Core Features Matrix

| Module | Features & Scope | Target User Roles | Status |
| --- | --- | --- | --- |
| **AI Bill Scanner** | OCR processing for incoming paper purchase bills & hand-written transport receipts | Super Admin, Admin, Accountant | Planned |
| **ERP Assistant Chatbot** | Natural language queries in Hindi/English (e.g., "Shiv Textiles ka kitna baaki hai?") | All Roles | Planned |
| **JST Khata Engine** | Native support for Jama (Credit), Sood (Interest calculations on late payments), Tax | Super Admin, Admin, Accountant | Planned |
| **Expense Manager** | Factory fuel/electricity bills, loom maintenance, spare parts expense tracking | Super Admin, Admin, Accountant | Planned |
| **P&L & GST Engine** | Profit & Loss statement generation, GSTR-1 and GSTR-3B monthly export summaries | Super Admin, Admin, Accountant | Planned |

---

## 5. V4 Detailed Breakdown — Operations, QR & Mobile App

Focuses on floor-level inventory tracking, barcode printing, customer self-service, and cross-platform mobile access.

### V4 Core Features Matrix

| Module | Features & Scope | Target User Roles | Status |
| --- | --- | --- | --- |
| **Yarn & Cloth Inventory** | Real-time yarn cone stock, beam count, finished cloth bale inventory | Super Admin, Admin | Planned |
| **Production Tracking** | Shift-wise loom output tracking, efficiency metrics, cloth defect flagging | Super Admin, Admin | Planned |
| **Barcode / QR Engine** | Label printing for cloth rolls and yarn bales with batch numbers | Super Admin, Admin | Planned |
| **WhatsApp Integration** | Automated WhatsApp dispatch of invoices, ledger reminders, and payment receipts | All Roles | Planned |
| **Customer Portal** | Self-service web interface for buyers to view ledgers and pending order status | External Buyers | Planned |
| **Mobile App (Expo)** | Cross-platform React Native app for Android/iOS floor-level management | Super Admin, Admin, Accountant | Planned |

---

## 6. V5 Detailed Breakdown — Scale & Enterprise

Supports multi-location expansion, enterprise sales channels, predictive AI analytics, and advanced billing automation.

### V5 Core Features Matrix

| Module | Features & Scope | Target User Roles | Status |
| --- | --- | --- | --- |
| **Multi-Branch ERP** | Multi-unit factory support (e.g., Manpur Unit 1, Gaya Depot), consolidated reporting | Super Admin | Planned |
| **Franchise / Agency** | Commission agent accounting, regional sales representative tracking | Super Admin, Admin | Planned |
| **B2B E-commerce** | Direct B2B online ordering portal for external cloth wholesalers nationwide | External Buyers, Admin | Planned |
| **AI Demand Forecasting** | Predictive yarn requirement models based on seasonal market demand (Chhath, Eid) | Super Admin, Admin | Planned |
| **Auto Purchase Orders** | Trigger automatic yarn PO generation when stock drops below safety thresholds | Super Admin, Admin | Planned |
| **Voice Billing** | Hands-free voice-to-text billing in Hindi for fast counter sales | Admin, Accountant | Planned |

---

## 7. Milestones per Version

| Version | Focus Area | Target Duration | Target Release Date | Primary Deliverable |
| --- | --- | --- | --- | --- |
| **V1** | Foundation & Sales | 6 Weeks | Q4 2026 | Invoicing, Party Ledger, Size Pricing, Admin Panel |
| **V2** | Supply Chain & Labour | 8 Weeks | Q1 2027 | Supplier POs, Karigar Wages, Transport Costs |
| **V3** | AI & Financials | 8 Weeks | Q2 2027 | OCR Bill Scanner, JST Sood Engine, GST Returns |
| **V4** | Operations & Mobile | 10 Weeks | Q3 2027 | Barcode/QR, Loom Tracking, Cross-Platform Mobile App |
| **V5** | Scale & Automation | 12 Weeks | Q4 2027 | Multi-Branch, AI Forecasting, B2B E-commerce |

---

## 8. Dependencies Matrix

| Module / Feature | Prerequisite Dependency | Reason for Dependency |
| --- | --- | --- |
| **V2 Purchase & Suppliers** | V1 Item Master & Auth | Requires registered yarn items and active user session context |
| **V2 Karigar Labour** | V1 Merchant & Item Master | Requires finished fabric pricing and party definitions |
| **V3 JST Khata (Sood Engine)** | V1 Invoices & Payments | Interest calculations rely on historical invoice payment delays |
| **V3 GST Reports** | V1 Sales & V2 Purchase | Tax return generation requires both input tax and output tax data |
| **V4 Mobile App** | V1-V3 REST API Endpoints | App consumes established backend REST service architecture |
| **V4 Barcode / QR Engine** | V4 Inventory Module | QR generation requires unique batch/bale numbers in inventory |
| **V5 Multi-Branch** | V1-V4 Single-Unit ERP | Multi-tenancy architecture builds upon stabilized single-unit logic |

---

## 9. Risks & Mitigations

| Identified Risk | Risk Severity | Impact Description | Mitigation Strategy |
| --- | --- | --- | --- |
| **Slow Onboarding for Karigars** | High | Resistance to digital wage tracking among traditional weavers | Implement ultra-simple Hindi UI and voice-guided input options |
| **Render Free Tier Expiry/Sleep** | Medium | Initial 15-30s delay frustrates counter users on first morning login | Active health-check ping during work hours + warm-up banner |
| **Unstable Internet in Clusters** | Medium | Inability to issue invoices during network outages | Local offline state caching with automatic background synchronization |
| **Complex Custom Interest Rates** | High | Non-standard traditional interest calculation methods across parties | Flexible rule engine for custom compounding and Grace Period rules |

---

## 10. Success Criteria per Version

### Version 1 (V1)

* [ ] User can log in with role-restricted navigation access (`admin`, `accountant`, `viewer`).
* [ ] System generates valid GST/Non-GST sales invoices with size-wise pricing variants.
* [ ] Invoice cancellation correctly reverses ledger records.
* [ ] Party ledger outputs matching debit/credit statements downloadable in PDF format.
* [ ] System renders response within 200ms on active backend connections.

### Version 2 (V2)

* [ ] Yarn inward challans accurately update raw material stock balances.
* [ ] Karigar piece-rate wages auto-populate to weaver ledger based on cloth production logs.
* [ ] Freight and transport costs correctly attach to purchase bill totals.

### Version 3 (V3)

* [ ] AI OCR accurately extracts items and totals from standard purchase bills with >85% accuracy.
* [ ] JST Khata engine correctly computes late payment interest (Sood) according to party terms.
* [ ] One-click export generates GSTR-1 compatible JSON/Excel files.

### Version 4 (V4)

* [ ] Barcode labels scan successfully on shop floor using mobile camera.
* [ ] Invoices and payment receipts automatically send via WhatsApp API.
* [ ] Mobile app runs smoothly on low-cost Android devices (2GB RAM).

### Version 5 (V5)

* [ ] Multi-branch mode enforces strict branch-level data isolation for standard users.
* [ ] AI demand model provides yarn stock replenishment alerts with >80% accuracy.

---

## 11. Future Explorations (Post-V5)

* **Blockchain Material Traceability:** Verifiable origin tracking for premium organic cotton and silk yarn blends.
* **IOT Loom Sensors:** Hardware telemetry integration directly onto power looms to track RPM, thread breakages, and real-time power consumption.
* **Automated Credit Scoring:** Internal credit risk scoring for buyer parties based on payment history and ledger age analysis.