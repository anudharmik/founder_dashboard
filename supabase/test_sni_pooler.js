import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function testSniPooler() {
  const tests = [
    {
      name: "SNI TLS servername on pooler port 6543",
      connStr: "postgresql://postgres:Turture123.@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
      ssl: { servername: "db.nxtcrjszmxqyaixpthpb.supabase.co", rejectUnauthorized: false }
    },
    {
      name: "SNI TLS servername on pooler port 5432",
      connStr: "postgresql://postgres:Turture123.@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
      ssl: { servername: "db.nxtcrjszmxqyaixpthpb.supabase.co", rejectUnauthorized: false }
    },
    {
      name: "options=project query param on pooler port 6543",
      connStr: "postgresql://postgres:Turture123.@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?options=project%3Dnxtcrjszmxqyaixpthpb",
      ssl: { rejectUnauthorized: false }
    },
    {
      name: "options=project query param on pooler port 5432",
      connStr: "postgresql://postgres:Turture123.@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?options=project%3Dnxtcrjszmxqyaixpthpb",
      ssl: { rejectUnauthorized: false }
    }
  ];

  for (const t of tests) {
    console.log(`Testing: ${t.name}...`);
    const client = new Client({ connectionString: t.connStr, ssl: t.ssl, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      console.log(`🎉 SUCCESS! ${t.name} connected!`);
      const res = await client.query("SELECT current_database(), current_user;");
      console.log("Query result:", res.rows[0]);
      await client.end();
      return t;
    } catch (err) {
      console.log(`Failed: ${err.message}`);
    }
  }
}

testSniPooler();
