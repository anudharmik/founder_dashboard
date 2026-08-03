import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function verifySchema() {
  console.log("=== PHASE 1 DATABASE SCHEMA VERIFICATION ===");
  const expectedTables = [
    "organizations",
    "departments",
    "org_members",
    "teams",
    "team_members",
    "projects",
    "project_teams",
    "goals",
    "tasks",
    "task_comments",
    "activity_log",
    "reminders",
    "org_billing",
    "guest_project_access"
  ];

  let missingTables = [];
  for (const table of expectedTables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      missingTables.push(table);
      if (error.code === '42P01' || error.code === 'PGRST205' || (error.message && error.message.includes('Could not find'))) {
        console.log(`❌ Table '${table}' missing or not accessible (code: ${error.code}).`);
      } else {
        console.log(`⚠️ Table '${table}' query returned error: ${error.message} (code: ${error.code})`);
      }
    } else {
      console.log(`✅ Table '${table}' exists and accessible.`);
    }
  }

  if (missingTables.length > 0) {
    console.log(`\nResult: ${expectedTables.length - missingTables.length}/${expectedTables.length} tables verified.`);
  } else {
    console.log(`\nResult: ALL ${expectedTables.length} tables successfully created and verified!`);
  }
}

verifySchema();
