import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  await client.connect();
  for (const table of ['departments', 'teams', 'projects', 'goals', 'milestones', 'tasks', 'scoped_permissions', 'org_members']) {
    const res = await client.query('SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1', [table]);
    console.log(`=== ${table} ===`);
    console.log(res.rows.map(r => `${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`).join(', '));
  }
  await client.end();
}
inspect().catch(console.error);
