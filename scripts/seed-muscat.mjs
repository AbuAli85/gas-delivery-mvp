/**
 * Seed script: 3 Muscat zones + 3 providers
 * Zones cover Muscat's main residential/commercial areas:
 *   1. Muscat (Old Muscat / Mutrah)
 *   2. Ruwi / CBD
 *   3. Al Khuwair / Ghubrah
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(DB_URL);

// ── Zones ──────────────────────────────────────────────────────────────────
const zones = [
  {
    name: "Old Muscat / Mutrah",
    city: "Muscat",
    centerLat: 23.6139,
    centerLng: 58.5922,
    polygon: JSON.stringify([
      { lat: 23.640, lng: 58.560 },
      { lat: 23.640, lng: 58.620 },
      { lat: 23.590, lng: 58.620 },
      { lat: 23.590, lng: 58.560 },
    ]),
  },
  {
    name: "Ruwi / CBD",
    city: "Muscat",
    centerLat: 23.6088,
    centerLng: 58.5928,
    polygon: JSON.stringify([
      { lat: 23.630, lng: 58.575 },
      { lat: 23.630, lng: 58.615 },
      { lat: 23.585, lng: 58.615 },
      { lat: 23.585, lng: 58.575 },
    ]),
  },
  {
    name: "Al Khuwair / Ghubrah",
    city: "Muscat",
    centerLat: 23.5957,
    centerLng: 58.4003,
    polygon: JSON.stringify([
      { lat: 23.620, lng: 58.370 },
      { lat: 23.620, lng: 58.430 },
      { lat: 23.570, lng: 58.430 },
      { lat: 23.570, lng: 58.370 },
    ]),
  },
];

const zoneIds = [];
for (const z of zones) {
  const [result] = await conn.execute(
    `INSERT INTO zones (name, city, centerLat, centerLng, polygon, isActive)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [z.name, z.city, z.centerLat, z.centerLng, z.polygon]
  );
  zoneIds.push(result.insertId);
  console.log(`✓ Zone: ${z.name} (id=${result.insertId})`);
}

// ── Providers ──────────────────────────────────────────────────────────────
const providers = [
  { zoneId: zoneIds[0], name: "GasExpress Mutrah",    phone: "+968-9100-0001", email: "mutrah@gasexpress.om" },
  { zoneId: zoneIds[1], name: "QuickFuel Ruwi",       phone: "+968-9100-0002", email: "ruwi@quickfuel.om"    },
  { zoneId: zoneIds[2], name: "FastGas Khuwair",      phone: "+968-9100-0003", email: "khuwair@fastgas.om"   },
];

for (const p of providers) {
  const [result] = await conn.execute(
    `INSERT INTO providers (zoneId, name, phone, email, isAvailable)
     VALUES (?, ?, ?, ?, 1)`,
    [p.zoneId, p.name, p.phone, p.email]
  );
  console.log(`✓ Provider: ${p.name} (id=${result.insertId}, zone=${p.zoneId})`);
}

await conn.end();
console.log("\nMuscat seed complete.");
