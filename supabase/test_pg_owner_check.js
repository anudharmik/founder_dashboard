import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log("=== Connected to PostgreSQL via DATABASE_URL ===");

  // 1. Inspect triggers on org_members
  const triggersRes = await client.query(`
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'org_members';
  `);
  console.log("Triggers on org_members:", triggersRes.rows);

  // 2. Inspect policies on org_members
  const policiesRes = await client.query(`
    SELECT policyname, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'org_members';
  `);
  console.log("Policies on org_members:", policiesRes.rows);

  // 3. Inspect existing test orgs and members
  const orgsRes = await client.query(`SELECT id, name FROM organizations LIMIT 5;`);
  console.log("Existing Orgs:", orgsRes.rows);

  if (orgsRes.rows.length > 0) {
    const testOrgId = orgsRes.rows[0].id;
    const membersRes = await client.query(`SELECT * FROM org_members WHERE org_id = $1;`, [testOrgId]);
    console.log(`Members for org ${testOrgId}:`, membersRes.rows);
  }

  await client.end();
}

main().catch(err => {
  console.error("Error running test:", err);
  client.end();
});
