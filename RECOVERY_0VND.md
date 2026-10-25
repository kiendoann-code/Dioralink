# DioraLink: recovery without changing production data (0 VND hosting)

## Current emergency

Render PostgreSQL `dpg-dar775nlot8c73enkec0-a` (database `dioralink_db_euas`) expired 2026-10-25T13:13:58Z and is suspended for billing. Render's official policy makes an expired Free database inaccessible until plan upgrade, and Free PostgreSQL has no Render-managed backups. No one should claim that creating another Free database will recover the original data. Official docs: https://render.com/docs/free and https://render.com/docs/postgresql-backups

**Production safety policy:**
- Do not change the existing Render `DATABASE_URL`, `PGHOST`, or signing secrets.
- Do not point `dioralink.xyz` at a blank Neon or Render database.
- Do not create fake balances, accounts, orders, or wallet ledger entries.
- Never delete the suspended database, even if services are down.
- On failed startup DB connection/schema check, `Server.js` now serves a 503 maintenance page **using a standalone HTTP server**, so no application POST/PATCH/PUT/DELETE route is reached and no writes are accepted.
- After recovering and validating the original dataset, redeploy. Normal application behavior remains unchanged when the existing database works.

## Free recovery paths to investigate

1. Search **local developer computers**, PostgreSQL/pgAdmin exports and existing project archives for `.dump`, `.backup`, `.sql`, `.tar`, `.zip` files, including Downloads and Documents. A local development database can also contain part of the dataset.
2. Search old CI artifacts and external backups (the current DioraLink Git repository has no PostgreSQL dump).
3. Request a **no-charge, read-only one-time export exception** directly from Render Support; this is discretionary and not promised under Render's Free policy. Do not authorize paid changes.
4. Preserve the original database and any credentials. Record the complete financial data integrity before switching hosting.

## Restore validation gates for a future complete backup

1. Restore only into **isolated Neon staging**, not the current production hostname.
2. Compare table counts and important IDs for `users`, `user_roles`, `commission_workflows`, `market_products`, `market_orders`, `diora_accounts`, `diora_ledger`, `diora_topups` and `diora_withdrawals` (table presence may vary by app version).
3. Reconcile wallet accounts versus ledger totals, and confirm customer order totals and unsettled wallet holds.
4. Check sensitive features through read-only test accounts. Do not enable new orders, payouts or commissions until validation completes.
5. Only after all checks: deploy existing backend against the verified dataset and then change DNS, retaining a rollback path.

The free Neon project `steep-violet-06235192` currently has no original transaction data. It is not a recovery backup.
