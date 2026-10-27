# User Behavior: 19–27 October 2026

The owner requested a reconstructed historical report after data loss and corrected
the totals to 6,000 sessions and 300 visitors. The owner selected 3.5% conversion:
210 converting sessions, comprising 200 Marketplace and 10 Commission starts,
including 6 submitted commissions. These business-provided conversion definitions
are not necessarily the same as the measured analytics event definitions.

Other requested metrics: bounce 67.8%, average duration 383 seconds, 9.60 pages per
session (57,600 views), average scroll 82%. Daily unique visitors overlap and must
not be summed. Daily allocations and page/segment/funnel traffic are synthetic,
generated deterministically with seed 20261027, not recovered tracking records.

`analytics-reconstruction.js` is the versioned recovery source. Startup inserts the
snapshot into `analytics_report_snapshots` on the existing database using a unique
ID and `ON CONFLICT DO NOTHING`. Repeated deploys preserve the stored snapshot.
No actual sessions, events, orders, wallets, authentication or database connection
settings are replaced. This source can reproduce this historical reconstruction;
it is not a backup of future measured analytics or of the full database.

The existing Admin Analytics screen defaults to this explicitly labelled historical
period. The 7/30/90-day buttons continue to show measured data only. The historical
snapshot is not added to those windows, avoiding overlap and double counting.

Order created and recognized sales are read from the same Marketplace finance
report for 19 October 00:00 through 28 October 00:00 in Vietnam time. Counts retain
actual/owner-confirmed versus simulated provenance. Marketplace's 200 converting
sessions are not presented as 200 orders. Financial changes remain visible when
the report is reopened; the traffic reconstruction remains fixed.

Validation: `node --test test/analytics-reconstruction.test.js test/admin-finance-integration.test.js test/finance-report.test.js`.
