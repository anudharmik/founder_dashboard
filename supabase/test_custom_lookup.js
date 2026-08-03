import pg from 'pg';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function testCustomLookup() {
  console.log("Resolving AAAA record via Google DNS...");
  const dnsRes = await fetch('https://dns.google/resolve?name=db.nxtcrjszmxqyaixpthpb.supabase.co&type=AAAA');
  const dnsJson = await dnsRes.json();
  const ipv6Address = dnsJson.Answer?.[0]?.data;
  console.log("Resolved IPv6 address:", ipv6Address);

  if (!ipv6Address) {
    console.error("Failed to resolve IPv6 address!");
    return;
  }

  const client = new Client({
    host: 'db.nxtcrjszmxqyaixpthpb.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'Turture123.',
    database: 'postgres',
    ssl: { rejectUnauthorized: false, servername: 'db.nxtcrjszmxqyaixpthpb.supabase.co' },
    lookup: (hostname, options, callback) => {
      console.log(`Custom lookup intercepting ${hostname} -> ${ipv6Address}`);
      callback(null, ipv6Address, 6);
    }
  });

  try {
    await client.connect();
    console.log("🎉 SUCCESS! Connected directly to Supabase via custom lookup!");
    const res = await client.query("SELECT current_database(), current_user;");
    console.log("QueryResult:", res.rows[0]);
    await client.end();
  } catch (err) {
    console.error("Custom lookup connection error:", err.message);
  }
}

testCustomLookup();
