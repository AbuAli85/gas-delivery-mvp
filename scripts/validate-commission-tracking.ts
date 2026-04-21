/**
 * Read-only sanity checks for provider commission totals vs delivered orders.
 *
 * Usage (from repo root, with DATABASE_URL set):
 *   npx tsx scripts/validate-commission-tracking.ts
 *   npm run validate:commission
 *
 * Loads `.env` when present via dotenv/config.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

type Row = Record<string, unknown>;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const connection = await mysql.createConnection(url);
  console.log("Validating commission tracking (read-only)…\n");

  const [providersWithOrders] = await connection.query<Row[]>(
    `SELECT id, name, totalOrders, totalCommission,
            ROUND(totalCommission / NULLIF(totalOrders, 0), 3) AS avgCommissionPerDelivery
     FROM providers
     WHERE totalOrders > 0
     ORDER BY id`
  );
  console.log("Providers with totalOrders > 0:");
  console.table(providersWithOrders);

  const [warnings] = await connection.query<Row[]>(
    `SELECT id, name, totalOrders, totalCommission,
            'totalOrders>0 but totalCommission is 0 (possible if all orders had 0 commission)' AS note
     FROM providers
     WHERE totalOrders > 0 AND totalCommission = 0`
  );
  if (warnings.length > 0) {
    console.log("\nWarnings (review if you expect default 0.100 per delivery):");
    console.table(warnings);
  }

  const [critical] = await connection.query<Row[]>(
    `SELECT id, name, totalOrders, totalCommission,
            CASE
              WHEN totalCommission < 0 THEN 'negative totalCommission'
              WHEN totalOrders > 0 AND (totalCommission / totalOrders) > 1.0 THEN 'avg commission per delivery > 1.0 OMR (sanity)'
            END AS issue
     FROM providers
     WHERE totalCommission < 0
        OR (totalOrders > 0 AND (totalCommission / totalOrders) > 1.0)`
  );
  if (critical.length > 0) {
    console.log("\nIssues (should be rare):");
    console.table(critical);
    await connection.end();
    process.exit(1);
  }

  const [recent] = await connection.query<Row[]>(
    `SELECT o.id AS orderId,
            o.assignedProviderId,
            p.name AS providerName,
            o.commissionAmount,
            o.deliveredAt
     FROM orders o
     LEFT JOIN providers p ON p.id = o.assignedProviderId
     WHERE o.status = 'delivered'
       AND o.deliveredAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)
     ORDER BY o.deliveredAt DESC
     LIMIT 15`
  );
  console.log("\nRecent delivered orders (last 24h, up to 15):");
  console.table(recent);

  const [stalePending] = await connection.query<Row[]>(
    `SELECT COUNT(*) AS stalePendingAssignments
     FROM order_assignments
     WHERE status = 'pending'
       AND createdAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
  );
  console.log("\nStale pending assignments (>10 min old):");
  console.table(stalePending);

  await connection.end();
  console.log("\nDone. No critical commission anomalies detected.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
