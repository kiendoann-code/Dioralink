# Koyeb Free deployment: DioraLink

This workflow is **manual only** and creates the `dioralink/api` Free service on Koyeb in Frankfurt, with port 3000 and a database health check. It **does not change** the `dioralink.xyz` DNS.

## Prerequisite: recover Render production data first

The original Render PostgreSQL resource `dpg-dar775nlot8c73enkec0-a` was suspended on 25 October 2026. The new Neon PostgreSQL 18 project `steep-violet-06235192` currently starts without the original customer, commission, order and Diora Wallet history. **Do not set `data_restored=true` until the entire database has been transferred and verified.**

1. Recover access to the suspended Render PostgreSQL instance or use a complete existing PostgreSQL backup.
2. Restore the entire PostgreSQL dataset into the Neon `dioralink` database (project `steep-violet-06235192`), preserving constraints, IDs, users, order histories, wallet balances and ledger transactions.
3. Compare table row counts, major financial aggregates and sample records before proceeding. Do not seed sample transactions or generate replacement IDs. Keep a separate backup.
4. Open GitHub repository Settings → Secrets and variables → Actions, and add **repository secrets**:
   - `KOYEB_API_TOKEN`: token generated under Koyeb's API Token settings. Do not commit it or post it in chat.
   - `DIORALINK_DATABASE_URL`: Neon PostgreSQL connection string including TLS/sslmode=require, for the restored `dioralink` database.
   - `DIORALINK_JWT_SECRET`: the current DioraLink production JWT signing secret **if existing sessions must remain valid**; otherwise a securely generated new secret (existing sessions will be invalidated).
5. Go to Actions → Deploy DioraLink to Koyeb Free (manual) → Run workflow, and check `data_restored` only after validating the migrated data.
6. Check the Koyeb temporary URL first: home, `/api/health`, logins, request inbox, marketplace, commission and wallet balances, new order flow and admin access. Set optional OAuth provider secrets in Koyeb if used.
7. Only after passing the production data and feature checks, point `dioralink.xyz` DNS to Koyeb. Do not delete Render PostgreSQL until a validated backup exists.

## Cost safeguards

The workflow sets `service-instance-type: free` and region `fra`. If a Free instance is unavailable, **stop**: do not silently deploy to a paid plan. The Free instance sleeps after inactivity and is intended for testing/hobby workloads, not a payment-critical production marketplace.

The GitHub workflow uses official Koyeb actions:
- https://github.com/koyeb/action-git-deploy
- https://github.com/koyeb-community/koyeb-actions
