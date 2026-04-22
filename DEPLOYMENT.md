# OWASEEL — Production deployment and operations

This document covers deploying and operating the **OWASEEL** gas delivery stack in this repository (**Express** + **Vite** client + **MySQL** + **Drizzle**). Replace example database names, paths, and hosts with yours.

## One-command pre-launch validation

Run from the **repo root** on **bash** (Git Bash, WSL, Linux, or macOS — not Windows `cmd.exe`):

```bash
npm run prelaunch
```

Same as:

```bash
bash scripts/pre-launch-check.sh
```

**What it runs (stops on first hard failure):**

1. `npm test` — Vitest suite (expect **87** cases under `server/**/*.test.ts`)
2. `npm run check` — TypeScript `--noEmit`
3. `npm run build` — Vite client + server bundle
4. **Env:** requires `DATABASE_URL` and `JWT_SECRET` (from the shell or a sourced `.env`). Warns if `ADMIN_PIN` is missing or `1234`, and if `FIREBASE_WEB_API_KEY` is missing.
5. `npm run validate:commission` — read-only DB sanity (uses `DATABASE_URL`)

**Optional MySQL CLI probes** (zones, sub-zones, approved providers, migration row count, `idx_%` index count, default PIN hash): only if the `mysql` client is on `PATH` **and** `MYSQL_DATABASE` is set. Example:

```bash
export MYSQL_DATABASE=your_db_name MYSQL_USER=root MYSQL_PASSWORD=secret
# optional: MYSQL_HOST=127.0.0.1
npm run prelaunch
```

Implementation: `scripts/pre-launch-check.sh`. Use this before `npx drizzle-kit migrate` on production or right after staging deploy.

---

## Pre-deployment checklist

### 1. Code quality

- [ ] All tests pass: `npm test` (expect **87** Vitest cases in `server/**/*.test.ts`; verify with `rg "^\s*it\(" server -g "*.test.ts"`)
- [ ] No TypeScript errors: `npm run check`
- [ ] No blocking errors in browser DevTools on staging
- [ ] **PWA**: install + core flows on **iOS Safari** and **Android Chrome** against your HTTPS URL
- [ ] Run **`npm run prelaunch`** (see [One-command pre-launch validation](#one-command-pre-launch-validation) above) or repeat those steps manually.

### 1.1 Delivery status flow (arrived / failed)

- [ ] Verify provider can mark `arrived` after `out_for_delivery`
- [ ] Verify provider can mark `failed_delivery` with reason + optional notes
- [ ] Verify failed orders can be rescheduled from Admin (`rescheduleFailedOrder`)
- [ ] Verify customer tracking shows failure reason/notes and stops polling on `failed_delivery`
- [ ] Verify admin list filters include `arrived` and `failed_delivery`

### 2. Database preparation

- [ ] Full backup (example):

  ```bash
  mysqldump -h HOST -u USER -p DATABASE_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] Apply migrations: `npx drizzle-kit migrate` (with production `DATABASE_URL` only when you intend to migrate prod)

- [ ] Verify performance indexes (names from migration `0015_fast_path_indexes`):

  ```sql
  SHOW INDEX FROM orders WHERE Key_name LIKE 'idx_%';
  SHOW INDEX FROM providers WHERE Key_name LIKE 'idx_%';
  SHOW INDEX FROM order_assignments WHERE Key_name LIKE 'idx_%';
  SHOW INDEX FROM provider_sub_zones WHERE Key_name LIKE 'idx_%';
  ```

- [ ] Run read-only checks: `npm run validate:commission`

### 3. Environment configuration

- [ ] `DATABASE_URL` — production MySQL
- [ ] `NODE_ENV=production` for production builds/runs
- [ ] `JWT_SECRET` — strong secret for cookies/sessions (`server/_core/env.ts`)
- [ ] `ADMIN_PIN` — **not** the default `1234` (`server/routers/providers.ts`, `customers.ts`)
- [ ] `APP_URL` — public origin (referral links, etc.)
- [ ] `FIREBASE_WEB_API_KEY` — server OTP/SMS path when Firebase SMS is enabled (`server/firebaseSms.ts`, `customerAuth.ts`)
- [ ] `VITE_FIREBASE_*` — client Firebase config (see client `firebase.ts` and `server/firebase.config.test.ts`)
- [ ] `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — Web Push for providers
- [ ] Optional: `TWILIO_*` (`server/sms.ts`), `STRIPE_SECRET_KEY`, `OAUTH_SERVER_URL` / `OWNER_OPEN_ID`
- [ ] **HTTPS** in front of the app (PWA, geolocation, secure cookies)

App title and meta live in `client/index.html` (e.g. **OWASEEL | أو وصل**). Add `VITE_*` vars only if your build injects them.

### 4. Seed data verification

Expectations depend on which scripts you ran (`scripts/seed-muscat.mjs`, `scripts/seed-sub-zones.mjs`, `scripts/seed-providers.mjs`). Typical checks:

```sql
SELECT providerStatus, COUNT(*) FROM providers GROUP BY providerStatus;
SELECT COUNT(*) AS zone_count FROM zones;
SELECT COUNT(*) AS sub_zone_count FROM sub_zones;
```

- [ ] Enough **`approved`** providers for each active **zone** you serve
- [ ] **Sub-zones** populated if you use sub-zone assignment (`seed-sub-zones.mjs` inserts many Muscat neighborhoods — count is not fixed here; compare to script output)

---

## Deployment steps

### Step 1: Database migration (production host)

```bash
cd /path/to/gas-delivery-mvp

# Backup first (critical)
mysqldump -h HOST -u USER -p DATABASE_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# Apply migrations (Drizzle reads drizzle/meta/_journal.json)
npx drizzle-kit migrate
```

Confirm Drizzle’s migration table (default name **`__drizzle_migrations`**) has new rows after migrate:

```sql
SELECT * FROM __drizzle_migrations ORDER BY id DESC LIMIT 5;
```

If that table does not exist, run `SHOW TABLES LIKE '%drizzle%';` — the exact name can depend on Drizzle Kit version.

### Step 2: Application deploy

```bash
git pull origin main   # or your release tag

# If npm hits peer conflicts:
npm install --legacy-peer-deps

npm run build
npm run start          # or: node dist/index.js
```

Use **PM2**, **systemd**, or a container with the same environment as your shell.

### Step 3: Smoke testing

1. **Customer**: open site → order flow → location → payment (cash / bank / mock online as configured) → tracking.
2. **Admin**: `/admin` — order appears; privileged routes require `ADMIN_PIN`.
3. **Provider**: `/provider/:id/login` — PIN flow (client sends **SHA-256 hex** of the 4-digit PIN; see `verifyPin` in `server/routers/providers.ts`) → accept → start delivery → deliver.
4. **Arrived / failed flow**: on an active mission, test `arrived`, then either:
   - successful completion (`deliverOrder`), or
   - failure (`markFailedDelivery`) then Admin reschedule (`rescheduleFailedOrder`).
5. **Commission**: `npm run validate:commission` again.
6. **Logs**: follow your process manager or platform logs for `ERROR` / failed requests.

---

## Post-deployment monitoring

### First hour

- [ ] Errors in application logs every ~15 minutes during peak
- [ ] Orders create and move status; providers can accept and deliver
- [ ] Provider totals:

  ```sql
  SELECT id, name, totalOrders, totalCommission FROM providers ORDER BY id;
  ```

### First day

- [ ] `npm run validate:commission` at least once
- [ ] Stale pending assignments:

  ```sql
  SELECT COUNT(*) AS stale_pending
  FROM order_assignments
  WHERE status = 'pending'
    AND createdAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE);
  ```

### First week

- [ ] Daily validation script where practical
- [ ] `SHOW PROCESSLIST;` during load if you see slow pages
- [ ] Scan logs for repeating stack traces

### Example SQL (monitoring)

Column names match **Drizzle** / MySQL (**camelCase**).

```sql
-- Orders per hour (last 24h)
SELECT HOUR(createdAt) AS hour, COUNT(*) AS order_count
FROM orders
WHERE createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY HOUR(createdAt)
ORDER BY hour;

-- Provider acceptance (from counters on providers)
SELECT id, name, acceptedOrders, rejectedOrders,
       ROUND(acceptedOrders / NULLIF(acceptedOrders + rejectedOrders, 0) * 100, 1) AS acceptance_rate_pct
FROM providers
WHERE acceptedOrders + rejectedOrders > 0
ORDER BY acceptance_rate_pct ASC;

-- Average delivery minutes by zone (last 7 days, delivered only)
SELECT z.name AS zone_name,
       COUNT(o.id) AS deliveries,
       ROUND(AVG(TIMESTAMPDIFF(MINUTE, o.acceptedAt, o.deliveredAt)), 1) AS avg_minutes
FROM orders o
JOIN zones z ON z.id = o.zoneId
WHERE o.status = 'delivered'
  AND o.acceptedAt IS NOT NULL
  AND o.deliveredAt IS NOT NULL
  AND o.deliveredAt > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY z.id, z.name
ORDER BY avg_minutes;
```

Targets in the table below are **aspirational** — tune to your market.

| Area | Example target |
|------|------------------|
| Orders per hour (peak) | Set from baseline after launch |
| Provider acceptance rate | Healthy marketplace (e.g. > 70%) |
| Avg delivery time | e.g. &lt; 45 minutes |
| Review average | e.g. &gt; 4.0 / 5 |
| API p95 latency | e.g. &lt; 500 ms at edge |
| Uptime | e.g. 99.5%+ |

---

## Operational runbooks

### Stuck assignment (pending too long)

Customer polling is supposed to expire old **pending** assignments (~5 minutes in app logic). If rows remain stuck:

```sql
SELECT oa.id, oa.orderId, oa.providerId, oa.status, oa.createdAt, o.status AS orderStatus
FROM order_assignments oa
JOIN orders o ON o.id = oa.orderId
WHERE oa.status = 'pending'
  AND oa.createdAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE);
```

Manual repair is risky; prefer **re-running customer status poll** or an admin tool that calls your reassignment path. If you must expire manually:

```sql
UPDATE order_assignments SET status = 'expired' WHERE id = ?;
```

Then ensure the order is reassigned or cancelled per product rules.

### Provider commission mismatch

Compare running totals to a **derived** sum from delivered orders (read-only diagnostic):

```sql
SELECT p.id, p.name, p.totalOrders, p.totalCommission,
       COUNT(o.id) AS delivered_order_rows,
       COALESCE(SUM(o.commissionAmount), 0) AS sum_commission_on_orders
FROM providers p
LEFT JOIN orders o ON o.assignedProviderId = p.id AND o.status = 'delivered'
WHERE p.id = ?   -- provider id
GROUP BY p.id, p.name, p.totalOrders, p.totalCommission;
```

If totals diverged after a bug or partial failure, fix **root cause** first, then consider a one-off corrective `UPDATE` with ops sign-off. Re-run `npm run validate:commission` after.

### Restore from backup

```bash
pm2 stop owaseel   # example

mysql -h HOST -u USER -p DATABASE_NAME < backup_YYYYMMDD_HHMMSS.sql

mysql -h HOST -u USER -p DATABASE_NAME -e "SELECT COUNT(*) FROM orders; SELECT COUNT(*) FROM providers;"

pm2 start owaseel
```

---

## Rollback procedure

1. **Stop new traffic** (maintenance page, LB drain, scale to zero).
2. **Code-only bug**: redeploy previous **git** revision / artifact; `npm install`, `npm run build`, restart process.
3. **Bad migration or data corruption**: restore **MySQL** from the pre-deploy **mysqldump**, then run the **previous** app version that matches that schema.
4. **Communicate** to operators/customers if orders were affected.
5. **Post-mortem**: logs, DB diff, ticket; re-run `npm run validate:commission` after recovery.

---

## Security checklist

- [ ] Database password strong; DB not exposed to the public internet
- [ ] HTTPS only for user-facing origins
- [ ] `ADMIN_PIN` changed from default
- [ ] `JWT_SECRET` strong and unique per environment
- [ ] Provider **PIN** on the wire is **SHA-256 hex (64 chars)** of the 4-digit PIN — stored value must match that scheme (`verifyProviderPin` compares to `providers.pinHash`)
- [ ] Restrict Firebase / Twilio keys by domain or IP where the vendor allows
- [ ] Customer OTP rate limit: **3 requests / 10 minutes** per phone (`server/routers/customerAuth.ts`)
- [ ] Confirm `.env` is not in git: `git log --all --full-history -- .env` (should be empty)
- [ ] Broader API rate limiting and admin audit logs are still **post-MVP** (see `todo.md`)

---

## Emergency contacts (fill in)

| Role | Contact |
|------|---------|
| Database / infra | |
| Application on-call | |
| Product / operations | |

External: [Firebase support](https://firebase.google.com/support), your hosting provider.

---

## Related documentation

| Topic | Location |
|-------|----------|
| Roadmap, limitations, test count | `todo.md` |
| Migration order | `drizzle/meta/_journal.json` |
| Commission / stale-assignment script | `npm run validate:commission` → `scripts/validate-commission-tracking.ts` |
| Brand | `brand-guidelines.md` (repo root) |

There is no root `README.md` in this repo at time of writing; add one for **local dev** if helpful.

---

## Troubleshooting

### `Cannot find module '.../gas-delivery-mvp/watch'`

You will see **`[Sentry] Instrumented via --import`** and then Node fails trying to load a file named **`watch`** in the project root.

**Cause:** `node` is being started with an extra positional argument `watch` (often copied from `tsx watch ...`). Node interprets the first positional after flags as the **entry script**, so it resolves **`./watch`**, which does not exist.

**Wrong:**

```bash
node --import ./dist/instrument.js watch
```

**Right (production):**

```bash
npm start
# equivalent:
node --import ./dist/instrument.js dist/index.js
```

**Right (development with reload):**

```bash
npm run dev
# equivalent: tsx watch server/_core/index.ts — do not replace with bare node + watch
```

If you use **PM2**, `ecosystem.config`, or systemd, ensure the exec line passes **`dist/index.js`** (after `npm run build`), not the word `watch`.

---

## Version history

| Date | Notes |
|------|--------|
| 2026-04-22 | Expanded deployment + operations guide; aligned with Drizzle/MySQL camelCase schema and repo scripts. |
| 2026-04-22 | Troubleshooting: Node `--import` + stray `watch` argument. |

**Last updated:** April 22, 2026
