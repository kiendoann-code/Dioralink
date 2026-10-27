# DioraLink — project instructions

## Admin finance scope

- Finance and Marketplace reports must appear inside the existing website's admin navigation (`admin-dashboard` and `admin-market`).
- A separate site, URL, login flow or Neon Function dashboard is not a substitute for updating those screens.
- Merge simulated and actual rows in the report while retaining provenance and separating simulated values from actual receipts. Do not display a demo-code column.

## Hosting and database policy

- The user confirmed on 27 October 2026 that DioraLink has already moved to Neon.
- Use the existing Neon project and deployment setup. Do not use Render again.
- Do not call Render tools or APIs, deploy or provision on Render, or trigger an old deployment workflow that uses Render (including through a Git push).
- Historical Render references in documentation, DNS, headers, or old workflows are legacy information, not authorization to use Render.
- If the current application deployment path is unclear, inspect the existing Neon setup and relevant deployment history before proposing another migration or asking the user to choose a host.
- Preserve existing data and authentication; do not create a replacement project or switch database connections merely to deploy a change.
