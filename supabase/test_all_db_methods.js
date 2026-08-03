import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DATABASE_URL;

async function testMethods() {
  console.log("=== TESTING DATABASE EXECUTION METHODS ===");

  // Method 1: Supabase API SQL endpoint
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    });
    console.log(`REST Root Status: ${res.status}`);
  } catch (e) {
    console.log(`REST Root Error: ${e.message}`);
  }

  // Method 2: Test poolers with direct IPv4 or host variants
  const connStrings = [
    dbUrl,
    `postgresql://postgres.nxtcrjszmxqyaixpthpb:Turture123.@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.nxtcrjszmxqyaixpthpb:Turture123.@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.nxtcrjszmxqyaixpthpb:Turture123.@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.nxtcrjszmxqyaixpthpb:Turture123.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
  ];

  for (const cs of connStrings) {
    if (!cs) continue;
    console.log(`Testing PG connection: ${cs.replace(/Turture123\./g, '***')}...`);
    const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 });
    try {
      await client.connect();
      console.log("✅ PG Connected successfully!");
      const res = await client.query("SELECT current_database(), current_user;");
      console.log("Query result:", res.rows);
      await client.end();
      return cs;
    } catch (e) {
      console.log(`PG Error: ${e.message}`);
    }
  }
}

testMethods();
