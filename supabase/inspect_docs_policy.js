import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkPolicies() {
  await client.connect();
  const res = await client.query("SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'project_docs'");
  console.log("=== POLICIES FOR project_docs ===");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

checkPolicies().catch(console.error);
