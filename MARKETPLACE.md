# DioraLink Marketplace

## Delivered flows

- `/marketplace`, product URLs and the homepage render live products in HTML with Vietnamese metadata, canonical URLs, Product/Offer markup and sitemap entries. No sample products are inserted in production.
- Artists manage products, photos, prices, available stock and payment settings at `/ung-dung#market-seller`; sales are at `#market-sales`.
- Customers choose COD or Diora Wallet (bank transfer remains available for legacy orders), supply delivery details, and actively accept versioned terms before an order is stored. Purchase history is at `#market-orders`.
- Artists accept orders and supply an SPX tracking number. Bank transfers require seller verification of actual receipt before shipping. COD completes after buyer receipt and seller payout reconciliation.
- Parties exchange evidence in the order history. Admin can resolve disputes, record full refunds, restore physically returned stock, and reconcile fees.
- Admin reporting at `/ung-dung#admin-market` includes daily trends, seller/product breakdowns, statuses, disputes and an XLSX workbook with four sheets.

## Financial rules

Source: user-provided `check 4.docx`, section 5.3, transaction commission table. Rates apply to the entire goods subtotal of one order, excluding shipping:

| Goods subtotal (VND) | Platform fee |
| --- | --- |
| Below 2,000,000 | 10% |
| 2,000,000 through 5,000,000 | 8% |
| Above 5,000,000 through 10,000,000 | 7% |
| Above 10,000,000 | 5% |

The document's overlapping 5,000,000 boundary is implemented in the 8% tier. Fees round to the nearest VND. Artist share is goods minus platform fee; it is not profit after materials, taxes or delivery costs. Shipping is charged once per order. Newly created grouped orders can contain multiple products from the same artisan, with shipping equal to the highest listed shipping fee among the products; different artisans are checked out separately. Legacy single-product orders are unchanged.

Price, fee rate, product description/images, bank instructions and the accepted terms are frozen in each order. Reports select orders by creation date in Vietnam time, and evaluate their current status. They are not cash-flow-period reports. Only completed orders without an open dispute contribute earned sales/fees. Actual fee receipts, outstanding fees, refunds and fees owed back are shown separately. Reports cover at most 366 days and 20,000 orders per current/comparison period.

## Payment, shipping and dispute operations

Funds move directly between customer and artist or through SPX COD. This implementation does not move funds, provide escrow, call bank APIs, book SPX shipments or automatically verify tracking. Artists enter real SPX references and reconcile receipts. Admin fee collection/refund actions record external transfers, with references in the audit log.

Pending orders reserve the stock of every line item until cancelled; there is no automatic reservation expiry. Repeated checkout with the same key returns the existing order, and conflicting reuse is rejected. Product row locks protect inventory; editing requires the version and last observed stock. Order row locks protect state transitions and one-time restocking/fee recording.

Disputes suspend completion and fee collection. Full refunds require an admin decision, seller refund reference/evidence, and buyer confirmation or admin verification. Partial refunds are not supported. If COD payout is still unconfirmed during a dispute, admin must record the agreed resolution and the seller must reconcile SPX receipt before a paid refund can be recorded. Stock is not restored after refund until admin confirms returned goods. Terms preserve statutory rights; video evidence is optional.

## Deployment

`npm ci && npm start` uses the existing PostgreSQL connection and authentication configuration. Startup creates four new `market_*` tables and indexes after users/public profiles exist. No existing rows are changed or seeded. No new API credentials are needed. Keep production database backups under the existing hosting policy. A rollback to the prior app version can leave these additive tables intact.

`exceljs` is a runtime dependency. PGlite is a development dependency for SQL-backed tests. Tests never connect to the production database; their test-header authentication exists only in `test/marketplace-fixture.js`.

## Validation

`npm test`: SEO regression tests plus PostgreSQL-engine integration coverage of permissions, immutable financial snapshots, fee boundaries, date ranges, inventory races, idempotency, COD/transfer state transitions, disputes, refund/fee reconciliation, public SSR/schema and XLSX numeric/date/text cells. PGlite serializes connections; production PostgreSQL additionally relies on the explicit row locks in the implementation.

Chromium end-to-end verification used isolated test users and an in-memory database: artist image upload/listing; homepage and product page at 390px; terms checkbox enforcement; customer checkout; artist acceptance/SPX; buyer receipt; COD reconciliation; admin chart and XLSX download. No test orders or products were written to production.

## Marketplace cart and vouchers (2026-10-25)

The browser stores a cart of up to 20 distinct products. The server verifies ownership, version, stock and payment method again inside the checkout transaction, and creates **one order per seller checkout**, with all line snapshots in `market_orders.items`. The order has one SPX tracking number and one shipping charge. COD cash collection is reconciled by the artisan after the buyer confirms receipt. Wallet orders reserve the discounted payable amount, then release the artisan payout and the net platform fee in one ledger settlement.

Real Marketplace vouchers are created in the Marketplace admin panel. They have an active period, minimum goods subtotal, total redemptions and per-buyer one-time redemption policy. Voucher discounts are borne by DioraLink through a reduction of its platform fee; the applied reduction is capped at the gross platform fee, leaving the artist's merchandise earnings unchanged. On cancellation/refund before or during reconciliation, unused entitlements are restored once. Voucher calculations are always performed on the server. No test voucher is seeded to production.

The migration adds JSONB order line snapshots and voucher columns to existing orders, plus `market_vouchers`; no legacy orders, bank records or wallet balances are rewritten. Before deployment, back up the database, run `npm ci && npm test`, and separately verify COD and wallet orders on a staging database. Shipping remains seller-configured and no SPX shipping-label API has been added.
