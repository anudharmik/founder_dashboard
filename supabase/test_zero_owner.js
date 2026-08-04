import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing environment variables VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log("=== Testing zero-owner scenario ===");

  const ts = Date.now();
  const email = `test_sole_owner_${ts}@example.com`;
  const password = 'TestPassword123!';

  // 1. Create sole owner user
  const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (userErr) {
    console.error("Failed to create test user:", userErr);
    return;
  }
  const userId = userData.user.id;
  console.log("Created test user:", userId);

  // 2. Create organization
  const { data: orgData, error: orgErr } = await supabaseAdmin.from('organizations').insert({
    name: `Test Org ${ts}`,
    created_by: userId
  }).select().single();
  if (orgErr) {
    console.error("Failed to create org:", orgErr);
    return;
  }
  console.log("Created org:", orgData.id);

  // Check org_members (created by trigger on organization creation or manual)
  let { data: members } = await supabaseAdmin.from('org_members').select('*').eq('org_id', orgData.id);
  if (!members || members.length === 0) {
    // insert manually if trigger didn't insert
    const { data: insMem } = await supabaseAdmin.from('org_members').insert({
      org_id: orgData.id,
      user_id: userId,
      role: 'owner'
    }).select();
    members = insMem;
  }
  console.log("Org members initially:", members);

  // Sign in as sole owner to test client permissions
  const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });
  if (authErr) {
    console.error("Failed sign in:", authErr);
    return;
  }

  const userClient = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  await userClient.auth.setSession({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token
  });

  // Test 1: Sole owner updates their own role to 'employee' via client (RLS check)
  console.log("\nAttempting to update sole owner role to 'employee' via RLS client...");
  const memberObj = members.find(m => m.user_id === userId);
  const { data: updateRes, error: updateErr } = await userClient
    .from('org_members')
    .update({ role: 'employee' })
    .eq('id', memberObj.id)
    .select();

  console.log("Update result:", { updateRes, updateErr });

  // Check owners count
  const { data: checkOwners } = await supabaseAdmin
    .from('org_members')
    .select('*')
    .eq('org_id', orgData.id)
    .eq('role', 'owner');
  console.log(`Current owners count for org ${orgData.id}:`, checkOwners?.length);

  // Test 2: Delete sole owner member record
  console.log("\nAttempting to delete sole owner member record via RLS client...");
  const { data: deleteRes, error: deleteErr } = await userClient
    .from('org_members')
    .delete()
    .eq('id', memberObj.id)
    .select();

  console.log("Delete result:", { deleteRes, deleteErr });

  // Check remaining members
  const { data: checkMembers } = await supabaseAdmin
    .from('org_members')
    .select('*')
    .eq('org_id', orgData.id);
  console.log(`Current total members count for org ${orgData.id}:`, checkMembers?.length);

  // Cleanup
  console.log("\nCleaning up test org & user...");
  await supabaseAdmin.from('org_members').delete().eq('org_id', orgData.id);
  await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
  await supabaseAdmin.auth.admin.deleteUser(userId);
  console.log("Cleanup complete.");
}

main();
