# Local public-artisan recovery (no paid services)

Open **https://dioralink.xyz/recovery-export.html** on the **same browser/device that visited DioraLink before the old Render database expired**. Click the export button. This standalone, public, noindex page reads only localStorage and selected referenced IndexedDB file blobs from that browser origin, without making an API request or sending data to servers.

Exports:
- Real cached public artist profiles in `dioralink_state_v25_directpay` (filters out hard-coded `A-001`.. demo creators).
- Draft profile and product form fields stored under `dioralink_form_draft_v1:`.
- Draft product images stored under `dioralink_market_product_media_v1:`.
- `asset:` images referenced by those records, if still present in `dioralink_attachment_store_v1/blobs` (up to 25 MiB).

Does **not** export cookies, admin secrets, bank details, wallet transactions or order identities. The browser export is only a possible partial source, *not* the original PostgreSQL records or verified artist identities. Never import blindly into live production. Review and match each recovered profile to its owner, check image rights, and never fabricate orders/wallet ledger entries.

Try every device, browser profile, and artist's own device used before database expiry. Do not clear site data/cache beforehand. If no results, user may have had no cached content.

Original suspended Render PostgreSQL **must not be deleted**. The restored Neon schema does not contain those old rows.
