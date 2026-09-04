import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testSqlEndpoints() {
  const endpoints = [
    `${url}/pg/v1/query`,
    `${url}/rest/v1/rpc/exec_sql`,
    `https://api.supabase.com/v1/projects/eisgwjzzcwgjunfuboen/database/query`
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ query: 'SELECT 1;' })
      });
      console.log(`Endpoint ${ep} status: ${res.status}`);
      const text = await res.text();
      console.log(`Response: ${text.substring(0, 200)}`);
    } catch (e) {
      console.log(`Endpoint ${ep} error: ${e.message}`);
    }
  }
}

testSqlEndpoints();
