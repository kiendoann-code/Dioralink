# DioraLink — project instructions

## Hosting and database policy

- The user confirmed on 27 October 2026 that DioraLink has already moved to Neon.
- Use the existing Neon project and deployment setup. Do not use Render again.
- Do not call Render tools or APIs, deploy or provision on Render, or trigger an old deployment workflow that uses Render (including through a Git push).
- Historical Render references in documentation, DNS, headers, or old workflows are legacy information, not authorization to use Render.
- If the current application deployment path is unclear, inspect the existing Neon setup and relevant deployment history before proposing another migration or asking the user to choose a host.
- Preserve existing data and authentication; do not create a replacement project or switch database connections merely to deploy a change.
