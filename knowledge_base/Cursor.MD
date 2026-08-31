# Fuel Pro — Shared Agent Context

## Project
- Repo: Petroleum-App-Enhancement (cloned into `/home/hanan/fuel-pro`)
- Frontend: Vite + React + Tailwind (`npm run dev`) — default Vite port **5173**
- Backend: Express API in `server/` (`npm run dev:api`) — default **PORT=4000**
- Vite proxies `/api` → `http://127.0.0.1:4002` (hardcoded in `vite.config.ts`; matches `server/.env` PORT)
- Dev CORS allows public/LAN Origin (e.g. `http://169.58.29.84:5173`), not only localhost
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

## Transactions page (2026-08-26, live)

**Status:** Live SQL via `GET /api/transactions`. Dummy `transactionsData.ts` removed.

### Files
- `src/dashboard/TransactionsPage.tsx` — filters, live summary, table/cards, lazy reveal + pager
- `src/dashboard/transactions.ts` — types + `fetchTransactions` / `fetchTransactionCustomers`
- `server/src/transactionRoutes.js` — SELECT-only list/summary + customer names
- Wired in `DashboardShell` when `active === 'transactions'` (all roles: `/transactions`, `/accountant/transactions`, `/user/transactions`)

### Behavior
- Prefetch on login/dashboard: first 50 rows + summary + AccReg names (`pageCache.ts`)
- First paint **15** rows; after ~5th row / sentinel reveal **+15** until 50; numbered pager for the next 50 (scrolls to top)
- Filters: searchable customer menu (All customers + typeahead), From/To dates, type menu, Reset + Filter — dropdowns stack above summary cards
- Summary: live COUNT / SUM(Credit) / SUM(Debit) / Net Flow (Credit − Debit). No dummy percentages
- Table: ledger-style double-entry rows — **Date**, **V.No**, **Account Name**, **Type** (payment mode: Online / Transfer / Cash from `SlipType` + `Description` + account), **Debit**, **Credit**. Each voucher shows 2 rows (debit leg + credit leg) like the legacy report.
- **2026-08-28:** Pair debit/credit legs by **matching amount** + same date/type; show **same V.No** on both rows (Slip entries often use different VNo per leg in DB, e.g. 272/273). **Debit row first, credit row second**. Single-leg **Slip** rows (no counter-entry in DB — common for Awais Corporation fuel slips) get a synthetic **Cash In Hand** opposite line so the table always shows 2 rows per voucher like the legacy report.
- Removed: ID column, Export, “Showing 1 to 10” / n-per-page dropdown
- Route changes (sidebar) also scroll to top via `DashboardShell`

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

## Merge conflict resolve (2026-08-26, Reports + pageCache)
- Unmerged: `src/dashboard/DashboardShell.tsx` on `feature/CustomerPage` while merging Reports from main.
- Resolution: keep **both** `pageCache` (`clearPageCache` / `prefetchDashboardPages`) and `ReportsPage` imports.
- Bottom nav: incoming renamed More → Reports (real page). Dropped HEAD `more`/`moreActive` + sidebar-open click. Kept HEAD nested Customers path match so details URLs stay on the Customers tab.
- Staged; merge commit not created unless requested.

## Customer Details page (2026-08-26, live)

- Opens at `/customers/{slug}` (or `/accountant/customers/{slug}`) — slug is `kebab-name-accid`, data loaded via `GET /api/customers/slug/:slug`
- **No** +Credit / +Debit buttons; **View All Transactions removed**
- Fields: AccNo (Customer ID), NIC (CNIC), Opening (ledger before today), Closing (full SUM Debit-Credit), name/phone/email/address/notes/Dated
- Summary: SUM(Credit), SUM(Debit), COUNT(Trid) — credit is 0 when Leger.Credit is 0 in DB
- History table uses `table-fixed`; long Product/Service wraps (2 lines); amounts stack PKR so columns stay inside the card.
- History date filter is **From – To** range (`dateFrom`/`dateTo` query params, inclusive). Empty range = all dates. Tab switch clears the range.
- Shared `src/dashboard/filters.tsx`: DateRangeFilter + MenuFilter. Entire control is clickable (`showPicker` / custom list). Customers list Status/Type use the styled menu; list date is From–To on `AccReg.Dated`.
- Dashboard prefetch: login + every visit to dashboard starts background fetch of customers (40) + groups + **live** transactions page 1 (50) + transaction customer names (`pageCache.ts`). Customers list shows 15, then +15 after scrolling ~5 rows (API batch 40). LoadingHint spinner with text.

## Customer details split (2026-08-26)

`CustomerDetailsPage.tsx` was 1000+ lines; split without behavior change. `CustomersPage` still imports `./CustomerDetailsPage`.

| File | Role |
|------|------|
| `dashboard/CustomerDetailsPage.tsx` | Fetch slug, tab/date/sort state, compose panels (~100 lines) |
| `dashboard/customerDetails/useCustomerHistory.ts` | Lazy history fetch / reveal / prefetch hook |
| `dashboard/customerDetails/Profile.tsx` | Back nav, profile, balances, info, summary |
| `dashboard/customerDetails/HistoryPanel.tsx` | Tabs, date/sort, mobile list + desktop table + intersection observers |
| `dashboard/customerDetails/ui.tsx` | Pills, chips, cards, table cells, icons |

Verified: login → `/customers` → open **Aarzi Dasti Khata** → details/info/summary/history → Credit History tab → Back to Customers.

## Backend inventory (2026-08-26, updated)

- **Only backend:** `app-enhancement/server/` — Express 5 + `mssql` (tedious). No Nest/Prisma.
- **Routes:** health, auth login/logout/me, **customers list/groups/slug/:slug/:accid/:accid/transactions**, **transactions list/customers**
- **SQL:** parameterized SELECT on `UserReg`, `AccReg`, `Leger`, `GroupReg` — never INSERT/UPDATE/DELETE
- **Auth:** JWT HS256 (`fl_token` + Bearer) + `requireRoles(Administrator, Accountant)` on customer routes + `requireRoles(Administrator, Accountant, User)` on transaction routes + `X-FuelLedger-Key` (`API_READ_KEY`) + 60/min rate limit
- **DB env:** `server/.env` — `DB_*`, `JWT_*`, `API_READ_KEY`
- **FE:** `src/lib/api.ts` sends Bearer + key; `customers.ts` is live helpers (mock array removed)
- **Balance:** `ISNULL(OpBal,0) + SUM(Debit) - SUM(Credit)`; history running balance via window on Trid; include Posted + NULL ledger rows

## Reports page (2026-08-28, live)

**Status:** Live SQL via `GET /api/reports/*`. Dummy `reportsData.ts` unused.

### Files
- `server/src/reportsRoutes.js` — filters, summary, product breakdown, recent tx (SELECT on `Leger` + `AccReg`)
- `src/dashboard/reports.ts` — FE API helpers
- `src/dashboard/ReportsPage.tsx` — same UI theme; live KPIs, filters, product table, mobile recent tx

### Filters (from DB)
- **Report Type** — `Leger.Type` (Slip, DSales, JV, Purchases, Adjustment, Sales) + All Types
- **Date Range** — `Leger.Dated` (defaults to min/max in DB)
- **Customer** — `AccReg` (70 accounts) + All Customers
- **Product** — PMG, HSD, HO, Cash, Other + All Products (desktop)

### Data shown
- KPIs: SUM(Credit), SUM(Debit), Net Flow, COUNT (`Leger`)
- Product table: **Stock In / Stock Out / Net** from `Stockleger` + `ItemReg`, current stock from `StockValue`; Cash/Other from `Leger`
- Product filter: all `ItemReg` items + Cash + Other
- Mobile: top 5 recent ledger rows (filtered)

## Reports page (2026-08-26)
- `src/dashboard/ReportsPage.tsx` + `reportsData.ts` — dummy UI
- Desktop: filters (+ product), Export, Generate, 4 KPIs, Product / Service Summary table only (no period selector on card; Top Customers removed 2026-08-28)
- Mobile: filters (no product), Generate, 2×2 KPIs, Recent Transactions
- Charts removed: Credit vs Debit, Daily Net Flow
- Wired in `DashboardShell` when `active === 'reports'`; bottom nav **Reports**

## Chart of Accounts (2026-08-28, live)

**Status:** Steps 1–3 UI unchanged; live SQL. Step 4 = separate **Account Ledger** page on account click.

### Navigation (4 levels)
1. **Charts** — `ChartAcc` via `GET /api/chart-of-accounts/charts`
2. **Sub Charts** — Sir Idrees query (`GroupReg` + `Leger` by `ChartId`, `BizId`) via `GET /api/chart-of-accounts/charts/:chartId/sub-charts`
3. **Accounts** — Sir Idrees query (`AccReg` by `GroupId`, `BizId`) via `GET /api/chart-of-accounts/groups/:groupId/accounts`
4. **Account Ledger** (new page, same shell) — `/chart-of-accounts/account/:accid` (+ accountant/user prefixes). Transactions + fuel summary (HSD/PMG/HO/Advance/Others).

### Files
- `server/src/coaRoutes.js` — charts, sub-charts, accounts, account detail, transactions, fuel summary (SELECT only; `BizId` from `CompanyPro.CompanyId`)
- `src/dashboard/chartOfAccounts.ts` — FE API helpers
- `src/dashboard/ChartOfAccountsPage.tsx` — steps 1–3 (UI same as dummy); account row → navigate to ledger
- `src/dashboard/CoaAccountLedgerPage.tsx` — step 4 transactions page
- `src/dashboard/coa/useCoaAccountHistory.ts` — lazy transaction load
- Routes: `App.tsx` + nested active tab in `DashboardShell` (like customers)
- Auth: Administrator, Accountant, **User** (all roles with COA nav)
- Sidebar order: Dashboard → **Chart of Accounts** (2nd) → Customers → …

### Back navigation
- Ledger **Back** returns to accounts list with `location.state.coaBack` restoring chart + sub-chart drill-down.

### Legacy
- `chartOfAccountsData.ts` — dummy data unused after live wiring; safe to remove later.

## Chart of Accounts — removed (2026-08-28)
- Restored from `main`; dummy UI in `ChartOfAccountsPage.tsx` + `chartOfAccountsData.ts`.
- **2026-08-28:** Removed **Code**, **Description**, **Type** columns (desktop + mobile) at all COA levels.

## Merge conflict resolve (2026-08-27, company brand)
- Unmerged: `src/dashboard/DashboardShell.tsx` on `feature/CustomerPage`.
- Working tree had dropped both import blocks while the body still used company helpers and `ChartOfAccountsPage`.
- Resolution: keep HEAD company brand (`./company`, pageCache, nested Customers tab, logout menus) **and** incoming `ChartOfAccountsPage` import/route.
- Staged; merge commit not created unless requested.

## Agent notes
- Multiple agents: read this file before work; update after meaningful changes.
- 2026-08-27: Public login 403 was CORS + proxy port. Vite now proxies to **4001**. Dev CORS allows `--host` public Origin. Both tmux sessions restarted.
- `knowledge_base/` is the shared coordination folder.

## Customer portal (2026-08-31)

**Status:** Live. Same FuelLedger yellow theme / shell. Role-gated away from admin pages.

### Login routing
- Staff (`UserReg`): Administrator → `/dashboard`, Accountant → `/accountant/dashboard`, User → `/user/dashboard`
- Customer (`AccReg.WebUser` + `WebPass`): → `/customer/dashboard` (role `Customer`)
- Staff username takes precedence if the same name exists in `UserReg`
- JWT for customers includes `accid` + display `name`; portal APIs are scoped to that Accid only

### Files
- `server/src/db.js` — `findCustomerByWebUser`
- `server/src/authRoutes.js` — AccReg login path after UserReg miss
- `server/src/portalRoutes.js` — `GET /api/portal/me`, `GET /api/portal/transactions`
- `server/src/index.js` — mounts `/api/portal` for role `Customer`; company brand allows Customer
- FE: `CustomerDashboard`, `CustomerPortalHome`, `CustomerPortalTransactions`, `portal.ts`, `usePortalHistory.ts`
- Routes: `/customer/dashboard`, `/customer/transactions` (`App.tsx` + `RoleRoute allow=['Customer']`)
- Nav: My Account + My Transactions only (`customerConfig`)

### UI
- My Account: profile, balances, **fuel summary** (HSD / PMG / HO / Advance / Others from Leger + BizId + optional date range), **10 recent transactions only**
- My Transactions: full history with All / Credit / Debit tabs + date range + sort

### Summary SQL (portal)
```sql
SELECT SUM(ISNULL(HSD,0)) AS HSD, SUM(ISNULL(PMG,0)) AS PMG, SUM(ISNULL(HO,0)) AS HO,
       SUM(ISNULL(Cash,0)) AS Advance, SUM(ISNULL(Other,0)) AS Others
FROM Leger WHERE Accid=@accid AND BizId=@bizId
  AND (optional Dated from/to)
```
- `GET /api/portal/me` returns `customer` + `summary`
- `GET /api/portal/summary?dateFrom&dateTo` refreshes fuel totals when dashboard date filter changes

### Test credential (dev, Accid 1723 Al Ghani ps)
- WebUser: `alghani` / WebPass: `test123` (set in AccReg for portal QA)

### Security
- Customers cannot call `/api/customers`, `/api/transactions`, COA, reports, dashboard staff APIs (403)
- Portal SELECT never returns WebPass / Pic

## Frontend `src/` architecture (2026-08-26 exploration)

### Routing model
- Single router in `src/App.tsx` (react-router-dom `BrowserRouter`).
- Role-gated routes all render thin page wrappers that mount `DashboardShell` with a role config.
- Non-dashboard paths (customers, credit, debit, **transactions**, reports) render real page components via `DashboardShell`.

### Key paths
- Shell: `src/dashboard/DashboardShell.tsx` (sidebar + header + mobile bottom nav)
- Home content: `src/dashboard/DashboardHome.tsx` — live **Recent Transactions** (top 5 from `/api/transactions`, force-refresh on visit)
- Nav/config: `src/dashboard/nav.ts` (`adminConfig` / `accountantConfig` / `userConfig`)
- Tokens: `src/index.css` `@theme` (`fuel` yellow `#f5c518`, surface, ink, credit/debit)
- Style helpers: `src/dashboard/styles.ts` (`panel`, `selectBtn`) — **no Button/Card/Table component library**
- Auth: `src/lib/auth.ts` + `src/components/ProtectedRoute.tsx` (`RoleRoute`, `PublicOnlyRoute`)

### Transactions routes (live)
- Admin: `/transactions`
- Accountant: `/accountant/transactions`
- User: `/user/transactions`
- Data: `GET /api/transactions` + `GET /api/transactions/customers`
