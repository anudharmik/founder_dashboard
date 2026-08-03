import pg from 'pg';
import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config();

dns.setDefaultResultOrder('ipv6first');

const { Client } = pg;

async function testIpv6() {
  const dbUrl = process.env.DATABASE_URL;
  console.log("Connecting with ipv6first option to:", dbUrl.replace(/Turture123\./g, '***'));
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log("🎉 SUCCESS! Connected directly to Supabase via IPv6!");
    const res = await client.query("SELECT current_database(), version();");
    console.log("DB info:", res.rows[0]);
    await client.end();
    return true;
  } catch (err) {
    console.error("IPv6 connection error:", err);
    return false;
  }
}

testIpv6();
