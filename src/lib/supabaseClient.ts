import { createClient } from '@supabase/supabase-js'
import { Database } from '../integrations/supabase/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required.");
}

// The <Database> generic provides full type safety for your Supabase client.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)