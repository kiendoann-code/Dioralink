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

## Availability and free-tier quota protection

- On 27 October 2026 the user required prevention of quota-related connection outages and explicitly reaffirmed Free only, with no charges. Do not upgrade Neon or Render, create paid services, or bypass provider limits.
- Check current database usage and remaining allowance before production traffic tests, bulk reads, exports, or repeated diagnostic runs. Do not run synthetic traffic campaigns or load tests against the live website; use local fixtures for testing.
- Keep database responses small: avoid transferring inline image bodies for listings and reports, and fetch only the requested media item. Preserve original media and transaction data.
- Do not repeatedly restart or redeploy to try to clear an exhausted provider quota. Report the specific exhausted allowance and the provider's current reset time. Do not claim recovery until a database read and the relevant website flow succeed.
- Free-tier limits cannot guarantee uninterrupted availability. If the provider blocks connections, preserve the existing project, data and authentication; explain any remaining external blocker without promising an automatic or immediate unlock.
