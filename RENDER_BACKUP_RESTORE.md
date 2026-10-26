# Render backup 25 October 2026 — isolated Neon staging

The original directory backup of dioralink_db_euas contains 21 tables and 5016 rows, SHA256 b7fc52a1a7a245a41de1ecd7a2e3c233828bbf45b553e560469261882732714d.

Admin-only helper URL: https://dioralink.xyz/render-backup-restore.html. Select the original .dir.tar.gz (do not unzip it). The file is transported over HTTPS only to this service and staged inside existing Neon database to two NEW tables render_backup_imports and render_backup_rows. Upload rejects nonmatching fingerprint, unsupported objects and malformed COPY data. New tables do not overwrite users, profiles, products, commission_workflows, or wallet tables. Upload is idempotent and transactionally protected.

**Do not merge legacy data blindly.** At least one email address exists in both original Render and Neon (different user IDs), and Naisu Toys Shop's newly created account differs from the original account. Restore passwords, wallet ledger and holds only after reconciling owners, transaction identities and account IDs. Do not delete original .tar.gz backup or the safety Neon branch.
