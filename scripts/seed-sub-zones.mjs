/**
 * Seed script: Insert Muscat sub-zones (wilayats/neighborhoods) into the DB.
 *
 * Muscat Governorate has 6 wilayats:
 *   1. مسقط (Muscat/Old Muscat) → mapped to zone 1 (مسقط القديمة / مطرح)
 *   2. مطرح (Muttrah)           → mapped to zone 1
 *   3. بوشر (Bousher)           → mapped to zone 3 (الخوير / الغبرة)
 *   4. السيب (Seeb)             → mapped to zone 4 (السيب / مسقط الدولي)
 *   5. العامرات (Al Amerat)     → mapped to zone 2 (الروي / وسط المدينة)
 *   6. قريات (Quriyat)          → outside current delivery zones
 *
 * Each wilayat is further divided into neighborhoods (أحياء).
 * Polygons are approximate bounding boxes for each neighborhood.
 *
 * Run: node scripts/seed-sub-zones.mjs
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Helper: create a rectangular bounding polygon from SW and NE corners
function rect(swLat, swLng, neLat, neLng) {
  return [
    { lat: swLat, lng: swLng },
    { lat: neLat, lng: swLng },
    { lat: neLat, lng: neLng },
    { lat: swLat, lng: neLng },
  ];
}

const subZones = [
  // ─── Zone 1: مسقط القديمة / مطرح (Old Muscat / Muttrah) ──────────────────
  {
    zoneId: 1,
    name: 'مطرح',
    centerLat: 23.6280,
    centerLng: 58.5920,
    polygon: rect(23.610, 58.570, 23.650, 58.620),
  },
  {
    zoneId: 1,
    name: 'مسقط القديمة',
    centerLat: 23.6130,
    centerLng: 58.5930,
    polygon: rect(23.595, 58.575, 23.635, 58.615),
  },
  {
    zoneId: 1,
    name: 'العذيبة',
    centerLat: 23.6050,
    centerLng: 58.5550,
    polygon: rect(23.590, 58.535, 23.625, 58.580),
  },
  {
    zoneId: 1,
    name: 'الغبرة الجنوبية',
    centerLat: 23.5980,
    centerLng: 58.5400,
    polygon: rect(23.580, 58.520, 23.618, 58.560),
  },

  // ─── Zone 2: الروي / وسط المدينة (Ruwi / CBD) ────────────────────────────
  {
    zoneId: 2,
    name: 'الروي',
    centerLat: 23.6000,
    centerLng: 58.5500,
    polygon: rect(23.585, 58.530, 23.618, 58.570),
  },
  {
    zoneId: 2,
    name: 'وادي الكبير',
    centerLat: 23.5950,
    centerLng: 58.5600,
    polygon: rect(23.580, 58.545, 23.612, 58.578),
  },
  {
    zoneId: 2,
    name: 'الحمرية',
    centerLat: 23.5900,
    centerLng: 58.5450,
    polygon: rect(23.575, 58.528, 23.608, 58.562),
  },
  {
    zoneId: 2,
    name: 'العامرات',
    centerLat: 23.5700,
    centerLng: 58.5900,
    polygon: rect(23.545, 58.560, 23.600, 58.625),
  },

  // ─── Zone 3: الخوير / الغبرة (Khuwair / Ghubra) ──────────────────────────
  {
    zoneId: 3,
    name: 'الخوير',
    centerLat: 23.5970,
    centerLng: 58.4710,
    polygon: rect(23.580, 58.450, 23.618, 58.495),
  },
  {
    zoneId: 3,
    name: 'غلا',
    centerLat: 23.6050,
    centerLng: 58.4900,
    polygon: rect(23.588, 58.470, 23.625, 58.510),
  },
  {
    zoneId: 3,
    name: 'الغبرة الشمالية',
    centerLat: 23.6100,
    centerLng: 58.5100,
    polygon: rect(23.595, 58.490, 23.628, 58.530),
  },
  {
    zoneId: 3,
    name: 'بوشر',
    centerLat: 23.5880,
    centerLng: 58.4550,
    polygon: rect(23.570, 58.430, 23.610, 58.480),
  },
  {
    zoneId: 3,
    name: 'الحيل',
    centerLat: 23.5800,
    centerLng: 58.4350,
    polygon: rect(23.562, 58.415, 23.600, 58.458),
  },

  // ─── Zone 4: السيب / مسقط الدولي (Seeb / Airport) ────────────────────────
  {
    zoneId: 4,
    name: 'الموالح',
    centerLat: 23.6000,
    centerLng: 58.2300,
    polygon: rect(23.582, 58.205, 23.620, 58.255),
  },
  {
    zoneId: 4,
    name: 'الموالح الجنوبية',
    centerLat: 23.5990,
    centerLng: 58.2290,
    polygon: rect(23.580, 58.205, 23.618, 58.253),
  },
  {
    zoneId: 4,
    name: 'المعبيلة الجنوبية',
    centerLat: 23.6050,
    centerLng: 58.2600,
    polygon: rect(23.588, 58.238, 23.625, 58.282),
  },
  {
    zoneId: 4,
    name: 'المعبيلة الشمالية',
    centerLat: 23.6200,
    centerLng: 58.2650,
    polygon: rect(23.604, 58.242, 23.640, 58.288),
  },
  {
    zoneId: 4,
    name: 'الخوض',
    centerLat: 23.5750,
    centerLng: 58.2000,
    polygon: rect(23.556, 58.178, 23.596, 58.222),
  },
  {
    zoneId: 4,
    name: 'الخوض الجديدة',
    centerLat: 23.5700,
    centerLng: 58.2100,
    polygon: rect(23.552, 58.190, 23.590, 58.232),
  },
  {
    zoneId: 4,
    name: 'الرسيل',
    centerLat: 23.5650,
    centerLng: 58.1900,
    polygon: rect(23.546, 58.168, 23.585, 58.212),
  },
  {
    zoneId: 4,
    name: 'السيب (وسط)',
    centerLat: 23.6600,
    centerLng: 58.1850,
    polygon: rect(23.640, 58.160, 23.680, 58.210),
  },
  {
    zoneId: 4,
    name: 'المصنعة',
    centerLat: 23.6750,
    centerLng: 58.1600,
    polygon: rect(23.655, 58.138, 23.695, 58.182),
  },

  // ─── Zone 5: القرم / مدينة السلطان قابوس (Qurum / MSQ) ──────────────────
  {
    zoneId: 5,
    name: 'القرم',
    centerLat: 23.5970,
    centerLng: 58.4980,
    polygon: rect(23.580, 58.478, 23.618, 58.518),
  },
  {
    zoneId: 5,
    name: 'مدينة السلطان قابوس',
    centerLat: 23.5900,
    centerLng: 58.4800,
    polygon: rect(23.572, 58.460, 23.610, 58.500),
  },
  {
    zoneId: 5,
    name: 'الشاطئ',
    centerLat: 23.6050,
    centerLng: 58.5050,
    polygon: rect(23.588, 58.485, 23.625, 58.525),
  },
  {
    zoneId: 5,
    name: 'جامعة السلطان قابوس',
    centerLat: 23.5820,
    centerLng: 58.4650,
    polygon: rect(23.564, 58.445, 23.602, 58.485),
  },
];

// Clear existing sub-zones and re-seed
await conn.query('DELETE FROM sub_zones');
console.log('Cleared existing sub_zones');

for (const sz of subZones) {
  await conn.query(
    'INSERT INTO sub_zones (zoneId, name, centerLat, centerLng, polygon, isActive) VALUES (?, ?, ?, ?, ?, true)',
    [sz.zoneId, sz.name, sz.centerLat, sz.centerLng, JSON.stringify(sz.polygon)]
  );
  console.log(`  ✓ Inserted: ${sz.name} (zone ${sz.zoneId})`);
}

const [rows] = await conn.query('SELECT COUNT(*) as cnt FROM sub_zones');
console.log(`\nTotal sub-zones seeded: ${rows[0].cnt}`);

await conn.end();
console.log('Done!');
