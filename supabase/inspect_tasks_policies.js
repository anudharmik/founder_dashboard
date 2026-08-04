import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspectPolicies() {
  await client.connect();
  const res = await client.query(`
    SELECT tablename, policyname, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename IN ('tasks', 'goals', 'milestones', 'projects', 'project_docs');
  `);
  console.table(res.rows.map(r => ({
    table: r.tablename,
    policy: r.policyname,
    cmd: r.cmd,
    with_check: r.with_check
  })));
  await client.end();
}

inspectPolicies();
