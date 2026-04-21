const mysql = require('./node_modules/mysql2/promise');
const fs = require('fs');

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const sql = fs.readFileSync('./drizzle/0012_simple_legion.sql', 'utf8');
  const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      await conn.execute(stmt);
      console.log('OK:', stmt.slice(0, 60));
    } catch (e) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('SKIP (exists):', stmt.slice(0, 60));
      } else {
        console.error('ERR:', e.message, '\n', stmt.slice(0, 80));
      }
    }
  }
  await conn.end();
  console.log('Migration done.');
}
run().catch(console.error);
