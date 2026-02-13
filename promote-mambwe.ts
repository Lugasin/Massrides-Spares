
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TARGET_EMAIL = "mambwemwila1@gmail.com";
const NEW_ROLE = "super_admin";

async function promoteUser() {
  console.log(`Promoting ${TARGET_EMAIL} to ${NEW_ROLE}...`);

  // 1. Find the user ID by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
      console.error("Error listing users:", listError);
      return;
  }

  const targetUser = users.find((u) => u.email === TARGET_EMAIL);

  if (!targetUser) {
    console.error(`User with email ${TARGET_EMAIL} not found.`);
    return;
  }

  const userId = targetUser.id;
  console.log(`Found User ID: ${userId}`);

  // 2. Update profiles table
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      role: NEW_ROLE,
      email: TARGET_EMAIL,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (profileError) {
    console.error("Error updating public.profiles:", profileError);
  } else {
    console.log(`Updated public.profiles for ${TARGET_EMAIL}.`);
  }

  // 3. Update user_profiles table (for consistency)
  const { error: userProfileError } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      role: NEW_ROLE,
      email: TARGET_EMAIL,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (userProfileError) {
    console.error("Error updating public.user_profiles:", userProfileError);
  } else {
    console.log(`Updated public.user_profiles for ${TARGET_EMAIL}.`);
  }

  console.log(`Promotion of ${TARGET_EMAIL} to ${NEW_ROLE} complete.`);
}

promoteUser();
