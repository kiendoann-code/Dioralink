# DioraLink Marketplace

## Delivered flows

- `/marketplace`, product URLs and the homepage render live products in HTML with Vietnamese metadata, canonical URLs, Product/Offer markup and sitemap entries. No sample products are inserted in production.
- Artists manage products, photos, prices, available stock and payment settings at `/ung-dung#market-seller`; sales are at `#market-sales`.
- Customers pay with Ví Diora, provide shipping details and can leave an optional buyer note (up to 1,000 characters) visible to the relevant artisan in order details. Notes are frozen on the order. Purchase history is at `#market-orders`.
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

The document's overlapping 5,000,000 boundary is implemented in the 8% tier. Fees round to the nearest VND. Artist share is goods minus platform fee; it is not profit after materials, taxes or delivery costs. Shipping is charged once per order. For one checkout containing multiple products from the same artisan and the same delivery address, the system creates exactly one order and applies the maximum listed SPX shipping fee once. Commission tier is calculated on combined goods subtotal, and one buyer receipt confirmation settles the entire order.

Price, fee rate, product description/images, bank instructions and the accepted terms are frozen in each order. Reports select orders by creation date in Vietnam time, and evaluate their current status. They are not cash-flow-period reports. Only completed orders without an open dispute contribute earned sales/fees. Actual fee receipts, outstanding fees, refunds and fees owed back are shown separately. Reports cover at most 366 days and 20,000 orders per current/comparison period.

## Cart and buyer notes

The cart is stored in Neon in `market_cart_items`, partitioned by authenticated customer, with a unique product per customer. Add again is idempotent (does not duplicate/increment), and customers explicitly edit quantities or remove items. Cart checkout groups items by artisan; different artisans need separate checkouts. All items from one artisan are checked and reserved atomically in one database transaction and combined into one order with a single wallet hold, SPX code and receipt confirmation. Each line remains identifiable in `market_order_items` (quantity, frozen price and product snapshot) for individual stock restocking and accurate per-product reporting. Cart checkout uses a buyer-supplied UUID idempotency key and `market_cart_checkouts` to return existing orders on retries instead of charging twice. Failed checkout rolls back stock changes, the single hold, and the order. It cannot be paid if any item is unavailable. Previously placed orders remain unchanged; merging historical individual orders would require separate reconciliation of funds and shipment details. Customer notes are saved as `market_orders.buyer_note` (not in the chat), visible to buyer, artisan and admin, but buyer delivery contact information remains redacted for artisans.

Routes: `/ung-dung#market-cart`, `#market-cart-add/:productId`, `#market-cart-checkout/:sellerId`. API: GET `/api/market/cart`, POST/PATCH/DELETE `/api/market/cart/items`, POST `/api/market/cart/checkout` (exact item paths in implementation). The original buy-now checkout remains available and also accepts buyer notes.

## Payment, shipping and dispute operations

New orders use Ví Diora wallet holds and release seller funds only after the customer confirms receipt. No bank/SPX integration or automatic tracking verification is implemented. Artists enter real SPX references and reconcile receipts. Admin fee collection/refund actions record external transfers, with references in the audit log.

Pending orders reserve inventory until cancelled; there is no automatic reservation expiry. Repeated checkout with the same key returns the existing order, and conflicting reuse is rejected. Product row locks protect inventory; editing requires the version and last observed stock. Order row locks protect state transitions and one-time restocking/fee recording.

Disputes suspend completion and fee collection. Full refunds require an admin decision, seller refund reference/evidence, and buyer confirmation or admin verification. Partial refunds are not supported. If COD payout is still unconfirmed during a dispute, admin must record the agreed resolution and the seller must reconcile SPX receipt before a paid refund can be recorded. Stock is not restored after refund until admin confirms returned goods. Terms preserve statutory rights; video evidence is optional.

## Deployment

`npm ci && npm start` uses the existing PostgreSQL connection and authentication configuration. Startup creates the Marketplace tables and additive cart, checkout-idempotency and order-note schema after users/public profiles exist. No existing rows are changed or seeded. No new API credentials are needed. Keep production database backups under the existing hosting policy. A rollback to the prior app version can leave these additive tables intact.

`exceljs` is a runtime dependency. PGlite is a development dependency for SQL-backed tests. Tests never connect to the production database; their test-header authentication exists only in `test/marketplace-fixture.js`.

## Validation

`npm test`: SEO regression tests plus PostgreSQL-engine integration coverage, including server-backed cart uniqueness, customer separation, buyer notes, atomic checkout, shipping-once logic, retry safety, stock rollback, permissions and immutable financial snapshots, fee boundaries, date ranges, inventory races, idempotency, COD/transfer state transitions, disputes, refund/fee reconciliation, public SSR/schema and XLSX numeric/date/text cells. PGlite serializes connections; production PostgreSQL additionally relies on the explicit row locks in the implementation.

Chromium end-to-end verification used isolated test users and an in-memory database: artist image upload/listing; homepage and product page at 390px; terms checkbox enforcement; customer checkout; artist acceptance/SPX; buyer receipt; COD reconciliation; admin chart and XLSX download. No test orders or products were written to production.
