# DioraLink — project instructions

## Admin finance scope

- Finance and Marketplace reports must appear inside the existing website's admin navigation (`admin-dashboard` and `admin-market`).
- A separate site, URL, login flow or Neon Function dashboard is not a substitute for updating those screens.
- Merge simulated and actual rows in the report while retaining provenance and separating simulated values from actual receipts. Do not display a demo-code column.

## Hosting and database policy

- The database has moved to the existing Neon project; preserve that database and its connection configuration.
- On 27 October 2026 the user lifted the Render ban and authorized deployment to the existing website, subject to no new paid services or plan upgrades. This supersedes the earlier Render prohibition.
- Before deployment, verify that the existing Render web service remains on the Free plan. Do not create paid resources, upgrade a plan, or resume the expired Render database.
- The user cannot obtain another backup from the former database. Do not require another recovery, replace the existing dataset, change database connections, or run destructive database operations to deploy application code.
- Update the existing website through its established deployment path. Do not create another reporting site or migrate hosting to solve a dashboard edit.
- Preserve existing data and authentication; do not create a replacement project or switch database connections merely to deploy a change.
