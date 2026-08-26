# Fuel Pro — Shared Agent Context

## Project
- Repo: Petroleum-App-Enhancement (cloned into `/home/hanan/fuel-pro`)
- Frontend: Vite + React + Tailwind (`npm run dev`) — default Vite port **5173**
- Backend: Express API in `server/` (`npm run dev:api`) — default **PORT=4000**
- Vite proxies `/api` → `http://127.0.0.1:4000`
- CORS expects FE at `http://localhost:5173` / `http://127.0.0.1:5173`
- SQL Server expected on **1433** (`DB_PORT` in `server/.env.example`)

## Server host
- Public IP: `169.58.29.84`
- User: `hanan`

## Port check (2026-08-26)

### Already in use (do not bind these for new FE/BE without stopping existing process)
| Port | Status | Notes |
|------|--------|-------|
| 4000 | IN USE | Project default BE — something already listening on `*:4000` |
| 5173 | IN USE | Project default FE (Vite) — listening on `127.0.0.1:5173` |
| 5180 | IN USE | Another Vite-like local listener |
| 1433 | IN USE | SQL Server (Docker/host) — needed by BE |
| 80 / 443 / 8443 | IN USE | HTTP/HTTPS / alt TLS |
| 22 | IN USE | SSH |
| 5432 | IN USE | PostgreSQL (localhost) |
| 7771–7777 | IN USE | Other services |
| 44444 | IN USE | Other service |

### Free / available for FE & BE alternatives
| Port | Suggested use |
|------|----------------|
| **5174** | Frontend (Vite alt) if 5173 busy |
| **3000** / **3001** | Frontend alt |
| **4173** | Vite preview |
| **5000** | Backend alt |
| **8000** / **8080** / **8081** | Backend alt |
| **8888** / **9000** | General free |

### Recommended for this project
- **FE**: prefer **5173** (default). If conflict → **5174** (update CORS if changed).
- **BE**: prefer **4000** (default). If conflict → **5000** or **8080** (update Vite proxy + `PORT` in `server/.env`).

## Run with host (network access)

Defaults `5173` / `4000` are busy — use free ports:

```bash
# Terminal 1 — Backend (already binds 0.0.0.0 by default)
cd /home/hanan/fuel-pro/server
PORT=5000 npm run dev

# Terminal 2 — Frontend with --host
cd /home/hanan/fuel-pro
npm run dev -- --host 0.0.0.0 --port 5174
```

- FE URL: `http://169.58.29.84:5174`
- BE URL: `http://169.58.29.84:5000`
- If FE uses Vite proxy, set proxy target to `http://127.0.0.1:5000` and add public FE origin to `CORS_ORIGIN`.

## Transactions page (2026-08-26)

**Status:** Dummy UI done — responsive desktop + mobile. Not wired to DB yet.

### Files
- `src/dashboard/TransactionsPage.tsx` — full page UI (filters, summary, table/cards, pagination)
- `src/dashboard/transactionsData.ts` — dummy rows + summary stats (swap for API later)
- Wired in `DashboardShell` when `active === 'transactions'` (all roles: `/transactions`, `/accountant/transactions`, `/user/transactions`)

### UI matches screenshot
- Desktop: title + breadcrumbs + Export, filters, 4 summary cards, table (ID, Date, Customer, Type, Product, Amount, Balance, Reference, Created By, Action), pagination
- Mobile: same filters, tinted 2×2 Summary, card list with type badge / amount / balance, bottom nav unchanged

### Next (user will provide)
- SQL / API query to replace `ALL_TRANSACTIONS` + `TX_SUMMARY` with live data

## Credit page (2026-08-26)

**Status:** Dummy UI done — responsive desktop + mobile. No Add Credit form (deferred). Theme uses existing FuelLedger yellow (`fuel`), not purple.

### Files
- `src/dashboard/CreditPage.tsx`
- `src/dashboard/creditData.ts`
- Wired in `DashboardShell` when `active === 'credit'` (`/credit`, `/accountant/credit`)

### UI
- Desktop: title + breadcrumbs, Filter + Add Credit (toast stub), 4 summary cards, recent credits table (View All → tx path)
- Mobile: title + subtitle, horizontal pastel summary strip, recent list with green +amounts
- Explicitly omitted: Add Credit Transaction form card

## Debit page (2026-08-26)

**Status:** Dummy UI done — same pattern as Credit. No Add Debit form. FuelLedger yellow theme (no purple).

### Files
- `src/dashboard/DebitPage.tsx`
- `src/dashboard/debitData.ts`
- Wired in `DashboardShell` when `active === 'debit'` (`/debit`, `/accountant/debit`)

### UI
- Desktop: title + breadcrumbs, Filter + Add Debit (toast stub), 4 summary cards, recent debit table (ID, Customer, Date, Product, Qty, Rate, Amount red, Balance, Created By)
- Mobile: title + subtitle, horizontal pastel summary strip, recent list with red `-amounts`
- Explicitly omitted: Add Debit Transaction form card

## Settings removed (2026-08-26)
- Removed Settings from sidebar nav, routes (`/settings`, `/accountant/settings`, `/user/settings`), and profile menu.
- Profile menu now only has Logout. Bottom "More" opens sidebar (path → reports).

## Logout confirm modal (2026-08-26)
- Logout in profile menu opens confirmation dialog; Confirm runs `apiLogout`, Cancel/backdrop/Esc closes.

## Merge conflict resolve (2026-08-26)
- Conflict only in `DashboardShell.tsx` after `git pull origin main --no-rebase`.
- Kept both: remote `CustomersPage` + local Transactions/Credit/Debit routing + logout modal.
- Settings remains removed (`showSection = active !== 'dashboard'`, `isCustomers = active === 'customers'`).
- Staged resolution; merge commit still needed by user if not committed yet.

## Customer Details page (2026-08-26)
- `src/dashboard/CustomerDetailsPage.tsx` — mobile + desktop dummy UI
- Opens when clicking a customer row/card or view icon from `CustomersPage`
- **No** +Credit / +Debit buttons (mobile or desktop)
- Desktop: breadcrumbs + **Back to Customers** only
- Customer Information + Summary use **icon cards** (name, phone, email, address, balances, notes, account since; credit/debit/tx summary)
- Detail extras via `getCustomerDetail()` in `customers.ts` (dummy CNIC/address/notes/txs)

## Reports page (2026-08-26)
- `src/dashboard/ReportsPage.tsx` + `reportsData.ts` — dummy UI
- Desktop: filters (+ product), Export, Generate, 4 KPIs, Top Customers + Product summary tables
- Mobile: filters (no product), Generate, 2×2 KPIs, Recent Transactions
- Charts removed: Credit vs Debit, Daily Net Flow
- Wired in `DashboardShell` when `active === 'reports'`; bottom nav **More** → **Reports**

## Agent notes
- Multiple agents: read this file before work; update after meaningful changes.
- `knowledge_base/` is the shared coordination folder.

## Frontend `src/` architecture (2026-08-26 exploration)

### Routing model
- Single router in `src/App.tsx` (react-router-dom `BrowserRouter`).
- Role-gated routes all render thin page wrappers that mount `DashboardShell` with a role config.
- Non-dashboard paths (customers, credit, debit, **transactions**, reports, settings) currently show `SectionPlaceholder` only — **no real Transactions page UI yet**.

### Key paths
- Shell: `src/dashboard/DashboardShell.tsx` (sidebar + header + mobile bottom nav)
- Home content: `src/dashboard/DashboardHome.tsx` (stats, charts, recent tx table — best UI reference for Transactions)
- Nav/config: `src/dashboard/nav.ts` (`adminConfig` / `accountantConfig` / `userConfig`)
- Tokens: `src/index.css` `@theme` (`fuel` yellow `#f5c518`, surface, ink, credit/debit)
- Style helpers: `src/dashboard/styles.ts` (`panel`, `selectBtn`) — **no Button/Card/Table component library**
- Auth: `src/lib/auth.ts` + `src/components/ProtectedRoute.tsx` (`RoleRoute`, `PublicOnlyRoute`)

### Transactions routes (exist, placeholder only)
- Admin: `/transactions`
- Accountant: `/accountant/transactions`
- User: `/user/transactions`

### Build Transactions by
1. Replace `SectionPlaceholder` branch in `DashboardShell` when `active === 'transactions'` (or add a dedicated page component and switch on `active` / pathname).
2. Reuse `TRANSACTIONS` mock + table/list patterns from `DashboardHome`.
3. Keep FuelLedger chrome (yellow active nav, `panel` cards, credit/debit badges).
