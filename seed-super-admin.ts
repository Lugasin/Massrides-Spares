
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

const SUPER_ADMIN = {
  email: "superadmin@massrides.com",
  password: "supersecurepassword123!",
  full_name: "System Architect",
};

async function seedSuperAdmin() {
  console.log(`Seeding Super Admin: ${SUPER_ADMIN.email}...`);

  // 1. Create Identity (Auth)
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
      console.error("Error listing users:", listError);
      return;
  }

  let userId = users.users.find((u) => u.email === SUPER_ADMIN.email)?.id;

  if (!userId) {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: SUPER_ADMIN.email,
      password: SUPER_ADMIN.password,
      email_confirm: true,
      user_metadata: { full_name: SUPER_ADMIN.full_name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return;
    }
    userId = newUser.user.id;
    console.log("Created Auth User:", userId);
  } else {
    console.log("User already exists:", userId);
  }

  // 2. Create/Update Profile with 'super_admin' role
  const { error: profileError } = await supabase
    .from("user_profiles")
    .upsert({
      id: userId,
      full_name: SUPER_ADMIN.full_name,
      role: "super_admin",
      is_active: true,
      email: SUPER_ADMIN.email,
      updated_at: new Date().toISOString(),
    })
    .select();

  if (profileError) {
    console.error("Error updating profile:", profileError);
  } else {
    console.log("Super Admin Profile Seeded Successfully! Role set to 'super_admin'.");
  }
}

seedSuperAdmin();
