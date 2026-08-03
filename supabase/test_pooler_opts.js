import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const configs = [
  { host: '2406:da1a:6b0:f623:79f5:6f6f:ab69:9717', port: 5432, user: 'postgres' },
  { host: 'aws-0-ap-south-1.pooler.supabase.com', port: 6543, user: 'postgres.nxtcrjszmxqyaixpthpb' },
  { host: 'aws-0-ap-south-1.pooler.supabase.com', port: 5432, user: 'postgres.nxtcrjszmxqyaixpthpb' },
  { host: 'aws-0-ap-south-1.pooler.supabase.com', port: 6543, user: 'postgres' },
  { host: 'aws-0-ap-south-1.pooler.supabase.com', port: 5432, user: 'postgres' }
];

async function testPoolers() {
  for (const c of configs) {
    const hostStr = c.host.includes(':') ? `[${c.host}]` : c.host;
    const connStr = `postgresql://${c.user}:Turture123.@${hostStr}:${c.port}/postgres`;
    console.log(`Testing ${c.user}@${c.host}:${c.port}...`);
    const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 });
    try {
      await client.connect();
      console.log(`🎉 SUCCESS! Connected to ${c.host}:${c.port}!`);
      await client.end();
      return connStr;
    } catch (e) {
      console.log(`Failed: ${e.message}`);
    }
  }
}

testPoolers();
