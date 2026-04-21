/**
 * Seed script: Insert Muscat sub-zones (wilayats/neighborhoods) into the DB.
 *
 * محافظة مسقط — 6 ولايات رسمية:
 *   1. مسقط (Old Muscat)  → zone 1
 *   2. مطرح (Muttrah)     → zone 1
 *   3. بوشر (Bousher)     → zones 2 + 3
 *   4. السيب (Seeb)       → zone 4
 *   5. العامرات (Al Amerat) → zone 2
 *   6. قريات (Quriyat)   → outside delivery zones
 *
 * تنبيه مهم:
 *   - المصنعة تابعة لمحافظة جنوب الباطنة وليست من مسقط — محذوفة
 *   - جامعة السلطان قابوس ليست حياً سكنياً — محذوفة
 *
 * Run: node scripts/seed-sub-zones.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

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

  // ─── Zone 2: الروي / وسط المدينة (بوشر + العامرات) ─────────────────────────
  // ولاية بوشر: الروي، وادي الكبير، الحمرية
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
  // ولاية العامرات (ولاية مستقلة في محافظة مسقط)
  {
    zoneId: 2,
    name: 'العامرات',
    centerLat: 23.5700,
    centerLng: 58.5900,
    polygon: rect(23.545, 58.560, 23.600, 58.625),
  },
  {
    zoneId: 2,
    name: 'الحيل الجنوبية',
    centerLat: 23.5650,
    centerLng: 58.4700,
    polygon: rect(23.548, 58.450, 23.585, 58.492),
  },

  // ─── Zone 3: الخوير / الغبرة (ولاية بوشر — الجزء الشمالي) ─────────────────
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
    centerLng: 58.4950,
    polygon: rect(23.570, 58.475, 23.610, 58.518),
  },
  {
    zoneId: 3,
    name: 'الحيل',
    centerLat: 23.5800,
    centerLng: 58.4750,
    polygon: rect(23.562, 58.455, 23.600, 58.498),
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
    name: 'النهضة',
    centerLat: 23.6150,
    centerLng: 58.2450,
    polygon: rect(23.598, 58.225, 23.634, 58.265),
  },
  // ملاحظة: المصنعة محذوفة — تابعة لمحافظة جنوب الباطنة وليست من مسقط

  // ─── Zone 5: القرم / مدينة السلطان قابوس (ولاية بوشر — الجزء الجنوبي) ────
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
    name: 'الأزيبة',
    centerLat: 23.5850,
    centerLng: 58.4900,
    polygon: rect(23.568, 58.470, 23.604, 58.510),
  },
  // ملاحظة: جامعة السلطان قابوس محذوفة — ليست حياً سكنياً
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
