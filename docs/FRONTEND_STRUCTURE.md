# FRONTEND_STRUCTURE.md

## 1. Executive Summary & Core Principles

This document outlines the frontend architecture for the **Patwatoli Textile ERP** client application. Built on **Next.js 15 (App Router)**, the client provides a responsive, performant, and secure admin panel for textile operations (yarn tracking, loom monitoring, sales/invoicing, and accounting).

### Key Architectural Principles

* **Lean & Maintainable:** Zero bloated client code or massive local state dumps. Use native server components where possible and isolate dynamic state to leaf components.
* **Role-Based Access Control (RBAC):** UI features, navigation, and actions dynamically adapt according to role identifiers (`super_admin`, `admin`, `accountant`, `viewer`).
* **Optimized for Tier-2/3 Bandwidth:** Low asset overhead, fast initial page loads, and optimistic UI updates for local network/mobile conditions.
* **Strict Type Safety:** Shared API response structures and TypeScript contracts matching backend models.

---

## 2. Directory & Folder Layout

The project follows the Next.js 15 App Router standard with feature-driven component colocation.

```
frontend/
├── public/
│   ├── favicon.ico
│   └── images/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── new/page.tsx
│   │   │   ├── party/
│   │   │   ├── reports/
│   │   └── admin/
│   │   ├── api/              # Route handlers / proxy (if needed)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/               # Reusable primitive UI components
│   │   ├── forms/            # Standardized form components
│   │   ├── layout/           # Sidebar, Navbar, Footer, Breadcrumbs
│   │   └── domain/           # Feature-specific components (e.g., InvoiceCancelModal)
│   ├── config/
│   │   ├── constants.ts
│   │   └── navigation.ts
│   ├── hooks/                # Custom React hooks (useAuth, usePagination)
│   ├── lib/                  # Utilities (fetch client, date formatters)
│   ├── store/                # Zustand global stores (auth, UI settings)
│   ├── types/                # TypeScript interfaces and API schemas
│   └── middleware.ts         # Next.js edge route protection
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json

```

---

## 3. Routing Architecture & RBAC Matrix

Role values in the frontend match the lowercase identifiers stored by the API and database: `super_admin`, `admin`, `accountant`, and `viewer`. Human-readable labels may use title case.

### Route Hierarchy

| Route Path | Access Roles | Description | Page Type |
| --- | --- | --- | --- |
| `/login` | Public | Authentication endpoint | Client Component |
| `/` | All Authenticated | Executive KPI dashboard | Server/Client Hybrid |
| `/invoices` | All Authenticated | Invoice list & filtering | Server Component |
| `/invoices/new` | Super Admin, Admin, Accountant | Create new GST/Non-GST invoice | Client Component |
| `/invoices/[id]` | All Authenticated | Invoice print view & details | Server Component |
| `/party` | Super Admin, Admin, Accountant | Weaver & buyer ledger details | Server Component |
| `/reports` | Super Admin, Admin | GST tax reports & P&L summaries | Server Component |
| `/admin` | Super Admin | User management and company setup | Server/Client Hybrid |

### Navigation Structure

Navigation items are defined in `src/config/navigation.ts` with role constraints:

* **Dashboard** (`/`) — All
* **Invoicing & Sales** (`/invoices`) — All
* **Parties & Ledgers** (`/party`) — `super_admin`, `admin`, `accountant`
* **Financial Reports** (`/reports`) — `super_admin`, `admin`
* **Admin Panel** (`/admin`) — `super_admin`

---

## 4. State Management Approach

To keep the application responsive and lightweight, state management is strictly categorized into **Global App State**, **Server/Cache State**, and **Local Component State**.

### State Breakdown

```
                     ┌─────────────────────────────────────────┐
                     │          State Management Plan          │
                     └────────────────────┬────────────────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        ▼                                 ▼                                 ▼
┌──────────────┐                  ┌──────────────┐                  ┌──────────────┐
│ Global State │                  │ Server Cache │                  │ Local State  │
│  (Zustand)   │                  │ (SWR/Fetch)  │                  │ (React State)│
├──────────────┤                  ├──────────────┤                  ├──────────────┤
│ • Auth User  │                  │ • Invoices   │                  │ • Form Inputs│
│ • JWT Tokens │                  │ • Party List │                  │ • Modal Open │
│ • Sidebar    │                  │ • Yarn Stock │                  │ • Date Range │
│ • Toast Msg  │                  │ • Analytics  │                  │ • Search Text│
└──────────────┘                  └──────────────┘                  └──────────────┘

```

1. **Global App State (Zustand):**
* Persists active user session profile, permissions, active tokens, and sidebar toggle status.
* Keeps storage footprint minimal (cleared on logout).


2. **Server & Data Fetching (SWR / Native Fetch):**
* Server components fetch directly from the Go API.
* Client interactions use SWR/fetch wrappers with automatic revalidation on mutate actions (e.g., cancelling an invoice or updating stock).


3. **Local UI State (`useState`, `useReducer`):**
* Used for inline modals, search filter inputs, and multi-step invoice item additions.



---

## 5. UI Layouts & Wireframe Concepts

### 5.1 Main Admin Shell (`/app/(dashboard)/layout.tsx`)

* **Header Bar:** Displays current company branch ("Patwatoli Textile"), active user role badge, connection status, and user avatar menu.
* **Collapsible Sidebar:** Left navigation menu auto-highlighting active route; dynamically filters items based on active role permissions.
* **Content Canvas:** Main container with breadcrumb navigation and max-width layout limits for ultra-wide displays.

### 5.2 Invoice Management List Screen (`/invoices`)

```
+--------------------------------------------------------------------------------+
| Invoices                                        [ + Create New Invoice ]       |
| Filter by Party: [ All Parties  v ]   Status: [ All Statuses v ]   [Search...] |
+--------------------------------------------------------------------------------+
| Invoice # | Date       | Party Name       | Total Amount | Status   | Actions  |
+-----------+------------+------------------+--------------+----------+----------+
| INV-1042  | 09/10/2026 | Shiv Textiles    | ₹1,42,500    | PAID     | [View]   |
| INV-1043  | 09/10/2026 | Gupta Weaving    | ₹88,000      | PENDING  | [View][X]|
| INV-1044  | 08/10/2026 | Gaya Handloom    | ₹45,200      | CANCELLED| [View]   |
+--------------------------------------------------------------------------------+
| Showing 1-3 of 142 items                                  < Prev  [1] 2 3  Next > |
+--------------------------------------------------------------------------------+

```

### 5.3 Invoice Cancel Workflow Wireframe

When clicking **Cancel Invoice [X]** on an eligible invoice (Role: `admin` or `super_admin`):

```
+--------------------------------------------------------------------------------+
| Modal: Cancel Invoice INV-1043                                              [X]|
+--------------------------------------------------------------------------------+
| WARNING: This will reverse stock and ledger entries.                           |
|                                                                                |
| Cancellation Reason (Required):                                                |
| [ Enter detailed reason e.g., Wrong quantity billed / Party order cancelled  ] |
|                                                                                |
| Confirm Invoice Number:                                                        |
| [ Type 'INV-1043' to confirm                                                 ] |
|                                                                                |
|                                                  [ Dismiss ]  [ Confirm Cancel ]|
+--------------------------------------------------------------------------------+

```

---

## 6. Authentication, Session & Token Flow

1. **Login Action:** User submits credentials at `/login`.
2. **Token Issuance:** Go Backend responds with an HTTP-only refresh cookie and a short-lived Access JWT.
3. **Client Persistence:** Access JWT and user details (id, name, role) are stored in the Zustand auth store.
4. **Middleware Protection:**
* Next.js `middleware.ts` inspects requests to protected routes.
* Redirects unauthenticated users back to `/login`.
* Restricts unauthorized roles from accessing restricted paths (e.g., `/reports` for `viewer`).


5. **Axios / Fetch API Interceptor Concept:**
* Automatically attaches `Authorization: Bearer <token>` to outbound API calls.
* Catches `401 Unauthorized` responses and initiates token refresh or forces redirect to `/login`.



---

## 7. Form Handling & Validation Strategy

* **Standardized Validation:** Forms use `react-hook-form` paired with `zod` schema definitions.
* **Form Schemas (`src/types/schemas/`):** Centralized Zod validation rules shared logically with backend expectations (e.g., phone numbers, GSTIN format, positive quantities).
* **Field Component Wrappers:** Reusable `<FormField>` inputs handle label formatting, inline error messages, and accessibility attributes (`aria-invalid`).
* **Submit UX:** All action forms display loading spinners on primary buttons during submission and disable multiple clicks.

---

## 8. Conventions & Coding Standards

### File Naming Conventions

* **Components:** PascalCase (e.g., `InvoiceTable.tsx`, `PartySelect.tsx`).
* **Utilities & Hooks:** camelCase with prefix (e.g., `useInvoices.ts`, `formatCurrency.ts`).
* **Route Folders:** lowercase-kebab-case (e.g., `yarn-inventory/`).

### Code Snippet Conventions (Max 10 Lines)

To enforce lightweight components, async server fetching is prioritized over large client hooks:

```tsx
// Example Server Component Fetch Pattern (LEAN)
export default async function InvoicePage() {
  const data = await getInvoices();
  return (
    <main className="p-6 space-y-4">
      <InvoiceHeader />
      <InvoiceTable invoices={data.items} />
    </main>
  );
}

```

### Styling Strategy

* **Tailwind CSS v4:** Utility-first styling with consistent theme values for colors, typography, and spacing.
* **Dark / Light Support:** Clean contrast targeting industrial admin panel environments.
* **Data Visuals:** Simple tabular layouts prioritized over heavy charting libraries to ensure smooth mobile rendering.

## 9. Item Master Screen (Expandable Size-Wise Pricing)

```
+--------------------------------------------------------------------------------+
| Item Master Catalog                                     [ + Add New Item ]     |
| Search: [ Cloth / Reed Quality... ]              Quality: [ All Qualities v ]  |
+--------------------------------------------------------------------------------+
| Code    | Quality / Fabric Name   | Base Price | HSN    | Sizes & Variant Pricing|
+---------+-------------------------+------------+--------+----------------------+
| ITM-001 | Gamcha Standard 80s     | ₹42.00     | 5208   | [v] 3 Size Variants  |
|   |---> | - Size 36x72 (Standard) | ₹42.00 / pc| GST 5% | [Edit]               |
|   |---> | - Size 40x80 (Jumbo)    | ₹48.00 / pc| GST 5% | [Edit]               |
| ITM-002 | Polyester Saree Warp    | ₹180.00    | 5407   | [>] 1 Size Variant   |
+--------------------------------------------------------------------------------+

```

---

## 10. Ledger Screen (Khaata Table)

```
+--------------------------------------------------------------------------------+
| Party Ledger (Khaata): Shiv Textiles                            [ Print / PDF ]|
| Date Range: [ 01/04/2026 ] to [ 09/10/2026 ]         Current Balance: ₹1,42,500|
+--------------------------------------------------------------------------------+
| Date       | Vch Type | Ref No.   | Particulars         | Debit (Dr) | Credit (Cr) |
+------------+----------+-----------+---------------------+------------+-------------+
| 01/04/2026 | Opening  | OB-2026   | Opening Balance     | ₹50,000    | -           |
| 15/04/2026 | Invoice  | INV-1042  | Cloth Sales (80s)   | ₹1,42,500  | -           |
| 20/04/2026 | Payment  | PAY-8821  | HDFC Bank Transfer  | -          | ₹50,000     |
+--------------------------------------------------------------------------------+
| Total Closing Balance: ₹1,42,500 (Dr)                                          |
+--------------------------------------------------------------------------------+

```

---

## 11. Executive Dashboard Screen

```
+--------------------------------------------------------------------------------+
| [ Total Sales: ₹12,45,000 ] [ Pending Collections: ₹3,12,000 ] [ Looms Active: 28/30 ] |
+--------------------------------------------------------------------------------+
| Top Buyers (This Month)                 | Low Stock Yarn Alerts                |
+-----------------------------------------+--------------------------------------+
| 1. Shiv Textiles  - ₹4,20,000 (12 Inv)  | • Cotton 80s Warp: 40 kg remaining   |
| 2. Gupta Handloom - ₹2,85,000 (8 Inv)   | • Polyester 150D: 15 kg remaining    |
| 3. Gaya Weavers   - ₹1,90,000 (5 Inv)   | • Dyes Red Tone: 5 kg remaining      |
+--------------------------------------------------------------------------------+

```

---

## 12. Admin Panel Feature Matrix

| Feature Module | Super Admin | Admin | Accountant | Viewer | Primary Capabilities |
| --- | --- | --- | --- | --- | --- |
| **User Management** | Full | Read-Only | None | None | Create users, assign roles, reset passwords |
| **System Settings** | Full | Edit Business Info | None | None | Tax rates, printer setup, invoice prefixes |
| **Audit Logs** | Full | View Own Branch | None | None | Trace invoice cancellations, pricing edits |
| **Reports & P&L** | Full | Full | Financial Only | None | Daily sales, GST return summary, ledger export |
| **Database Backups** | Full | None | None | None | Trigger manual backups, view snapshot logs |

---

## 13. Error Handling & Toast Notification Patterns

* **Form Validation:** Field-level inline Zod errors display directly under input boxes with red border highlights.
* **Global API Errors:** Handled via centralized fetch response interceptor that translates HTTP status codes into standardized toast messages.
* **Toast Hierarchy:**
* *Success (Green):* Action confirmation (e.g., "Invoice INV-1043 created successfully").
* *Warning (Yellow):* Non-blocking notices (e.g., "Yarn stock low for Cotton 80s").
* *Error (Red):* Operation failures or unauthorized actions (e.g., "Cancellation failed: Reason required").


* **Network Failures:** Sticky top banner alerts users when internet connectivity drops during active transactions.

---

## 14. Loading States & Render Cold-Start Banner

* **Skeleton Screens:** Text placeholders and table rows render matching pulse animations during data fetching to prevent layout shifts.
* **Button Action States:** Primary buttons switch to inline loading spinners and disable double-clicks upon submission.
* **Render Free Tier Wake-up Banner:**
* Displays a top notification bar when backend API requests take longer than 3 seconds on initial cold boots.
* Informs users: *"Waking up server instance on Render Free Tier... please wait 15–30 seconds."*
* Disappears automatically as soon as the health check ping returns HTTP 200.



---

## 15. PDF Handling Approach

* **Server-Side PDF Generation:** PDF invoices and ledger statements are generated on the Go backend using headless HTML-to-PDF templates.
* **Client-Side Viewing:** Frontend renders PDFs using native browser blob preview wrappers (`<iframe>` or object preview modals).
* **Direct Printing:** Provide a dedicated **Quick Print** action button that invokes the native browser print dialog (`window.print()`) on an optimized print CSS layout.
* **Download Caching:** Rendered PDF blobs are fetched as stream attachments and cached locally to avoid regenerating unchanged historical documents.

---

## 16. Environment Variables

| Variable Name | Description | Example Value (Development) |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Go backend REST API root URL | `http://localhost:8080/api/v1` |
| `NEXT_PUBLIC_APP_NAME` | Application display title | `Patwatoli Textile ERP` |
| `NEXT_PUBLIC_ENABLE_COLD_START_BANNER` | Toggles Render free-tier wake-up toast | `true` |
| `NEXT_PUBLIC_DEFAULT_PAGE_SIZE` | Default pagination count for tables | `15` |
| `NEXT_PUBLIC_ENABLE_MOCK_DATA` | Fallback flag for offline UI testing | `false` |

---

## 17. Deployment Strategy (Vercel)

* **Deployment Platform:** Vercel Hobby / Pro tier connected to GitHub repository main branch.
* **Build Configuration:** Automatic Next.js framework detection running `next build` with standard static optimization.
* **Environment Configuration:** Inject production backend API domain (`NEXT_PUBLIC_API_BASE_URL`) via Vercel Project Settings.
* **Edge Caching & Headers:** Configure `vercel.json` for security headers (HSTS, Content Security Policy) and edge caching rules for public assets.
* **Continuous Delivery:** Automated preview deployments triggered on Pull Requests; main branch commits automatically deploy to production.

---

## 18. Workflow: Adding a V2 Screen

1. **Route Definition:** Create folder under `src/app/(dashboard)/<feature-name>/page.tsx`.
2. **Type Definition:** Add TypeScript data models and Zod validation schemas in `src/types/domain/`.
3. **Navigation Integration:** Add route, icon, and role constraints to `src/config/navigation.ts`.
4. **API Service Integration:** Add corresponding fetch functions and mutation hooks in `src/lib/api/`.
5. **UI Construction:** Build page layout using Server Components for initial fetches and client components for leaf interactions.