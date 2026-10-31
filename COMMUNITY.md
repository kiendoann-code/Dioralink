# DioraLink Community — first release

Community is part of the existing website at `/ung-dung#community`. Post links use `/ung-dung#community-post/<uuid>`; moderation uses `/ung-dung#admin-community` and the existing admin session.

## Included

- Five curated groups, text posts with tags, search, hot/new/top sorting, week/month/all top filters, and pagination (20 posts per page).
- Threaded, collapsible comments loaded 50 at a time, upvotes/downvotes that can be changed or withdrawn, private saved posts, and an author-selected answer for question posts.
- Scores hidden for the first hour. Self-voting is rejected. Vote and save uniqueness is enforced in PostgreSQL.
- Reports, hide/restore posts, lock/unlock discussions, remove comments, and a persistent moderation audit reason. Removed comments remain placeholders so replies survive. Removing an accepted answer clears the resolved badge.
- Authenticated writes use existing user accounts. Moderation uses existing platform admin authentication. Posting cooldowns and report limits are enforced in the database, not just the browser.
- Public responses exclude emails and report authors; feed bodies are truncated in SQL. Comment attachment metadata is loaded separately; media bytes are fetched only for the requested attachment. Original bytes are preserved in a separate table.

## Comment attachments and emoji

- Up to 3 files per comment, 2 MB each: JPEG, PNG, WebP, PDF and TXT. Server checks size, count, base64 and file signatures before committing the comment and files in one transaction.
- Image previews, removable selected-file chips, document download links, and a keyboard-accessible emoji picker that inserts at the cursor. Image-only and emoji-only comments are supported.
- Attachment metadata excludes file bodies. Hidden comments or threads also hide attachment URLs; files are retained for restoration. Downloads use nosniff, sandbox CSP and attachment disposition for documents.
- Selected files survive in-page vote/save refreshes for the same user and thread; they must be reselected after a full page reload.

## Deliberately deferred

Image uploads on posts, product attachments, karma privileges, user-created groups, notification delivery, post editing/deletion by authors, and automatic moderation queues. No simulated posts are installed into production. Posts remain text-first. Comments support images and documents.

## Deployment and rollback

`ensureCommunitySchema` is called during the existing server startup. It only creates new `community_*` tables and indexes, with foreign keys to existing user IDs. No existing data or connection configuration is replaced. Schema creation is idempotent. Roll back application files to disable Community; retain its tables and all contributions.

Use the existing Render service and Git deployment path only after verifying the service is still Free. Check current Neon usage before production verification. Do not create resources, change plans, or run traffic tests against production.

## Verification

`node --test test/community.test.js` runs against an in-memory PostgreSQL fixture, covering authentication, vote uniqueness, answer ownership, cross-thread rejection, saved posts, hidden content, report/moderation, cooldowns, search and pagination, response size, escaping, and integration points.

The full repository suite currently has pre-existing failures in Marketplace fixtures (`legacy_restore_control` is absent), the legacy Neon finance assertion, SEO publication, and the old contact-policy assertion. The same 10 failing cases reproduce on commit `2578164` without Community changes.
