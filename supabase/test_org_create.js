import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, serviceKey);

async function testOrgCreate() {
  const ts = Date.now();
  const email = `test_trig_${ts}@example.com`;
  const password = 'TestPassword123!';

  const { data: u, error: e } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  if (e) { console.error("Create user error:", e); return; }

  const client = createClient(url, anonKey);
  await client.auth.signInWithPassword({ email, password });

  // Test 1: Insert without .select()
  const { error: insertErr } = await client.from('organizations').insert({ name: 'Test Org No Select' });
  console.log("Insert without .select() result:", insertErr);

  // Check if user is in org_members now using admin client
  const { data: mems } = await supabaseAdmin.from('org_members').select('*').eq('user_id', u.user.id);
  console.log("Org members created by trigger:", mems);

  await supabaseAdmin.auth.admin.deleteUser(u.user.id);
}

testOrgCreate();
