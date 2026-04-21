import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await createConnection(url);

const newHash = '2cec8cf0e321c284fa0c2ebef804aac18bf1cbb85546f89e7e3d0b6aa8b9d2cf'; // SHA-256 of "1205"
const providerId = parseInt(process.argv[2] || '9', 10);

const [result] = await conn.execute(
  'UPDATE providers SET pin_hash = ? WHERE id = ?',
  [newHash, providerId]
);
console.log('Rows affected:', result.affectedRows);

const [rows] = await conn.execute('SELECT id, name, pin_hash FROM providers WHERE id = ?', [providerId]);
console.log('Updated provider:', JSON.stringify(rows[0]));
await conn.end();
