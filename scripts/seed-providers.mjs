import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DB_URL);

// Three demo providers covering different city zones
const providers = [
  {
    name: "FastGas North",
    phone: "+1-555-0101",
    email: "north@fastgas.com",
    zoneLabel: "North District",
    zoneCenterLat: 25.2048,
    zoneCenterLng: 55.2708,
    zonePolygon: JSON.stringify([
      { lat: 25.25, lng: 55.22 },
      { lat: 25.25, lng: 55.32 },
      { lat: 25.18, lng: 55.32 },
      { lat: 25.18, lng: 55.22 },
    ]),
    isAvailable: true,
  },
  {
    name: "QuickFuel Central",
    phone: "+1-555-0202",
    email: "central@quickfuel.com",
    zoneLabel: "Central District",
    zoneCenterLat: 25.1972,
    zoneCenterLng: 55.2744,
    zonePolygon: JSON.stringify([
      { lat: 25.22, lng: 55.24 },
      { lat: 25.22, lng: 55.31 },
      { lat: 25.17, lng: 55.31 },
      { lat: 25.17, lng: 55.24 },
    ]),
    isAvailable: true,
  },
  {
    name: "GasPro South",
    phone: "+1-555-0303",
    email: "south@gaspro.com",
    zoneLabel: "South District",
    zoneCenterLat: 25.1124,
    zoneCenterLng: 55.1390,
    zonePolygon: JSON.stringify([
      { lat: 25.15, lng: 55.10 },
      { lat: 25.15, lng: 55.20 },
      { lat: 25.08, lng: 55.20 },
      { lat: 25.08, lng: 55.10 },
    ]),
    isAvailable: true,
  },
];

for (const p of providers) {
  await conn.execute(
    `INSERT INTO providers (name, phone, email, zonePolygon, zoneCenterLat, zoneCenterLng, zoneLabel, isAvailable)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=name`,
    [p.name, p.phone, p.email, p.zonePolygon, p.zoneCenterLat, p.zoneCenterLng, p.zoneLabel, p.isAvailable]
  );
  console.log(`✓ Seeded provider: ${p.name}`);
}

await conn.end();
console.log("Seeding complete.");
