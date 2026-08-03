import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testEndpoints() {
  const endpoints = [
    { url: `${url}/rest/v1/rpc/exec_sql`, body: { query: "create table if not exists test_ping (id int);" } },
    { url: `${url}/rest/v1/rpc/execute_sql`, body: { query: "create table if not exists test_ping (id int);" } },
    { url: `${url}/rest/v1/rpc/run_sql`, body: { sql: "create table if not exists test_ping (id int);" } },
    { url: `${url}/pg/v1/query`, body: { query: "create table if not exists test_ping (id int);" } }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify(ep.body)
      });
      console.log(`Endpoint ${ep.url} status: ${res.status}`);
      const text = await res.text();
      console.log(`Response: ${text.substring(0, 150)}`);
    } catch (e) {
      console.log(`Endpoint ${ep.url} error: ${e.message}`);
    }
  }
}

testEndpoints();
