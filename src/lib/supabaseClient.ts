import { createClient } from '@supabase/supabase-js'

// Using fixed project credentials provided for this Lovable preview
const supabaseUrl = 'https://oczgmklqckxywhdahoij.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jemdta2xxY2t4eXdoZGFob2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDEwNTQsImV4cCI6MjA3MDU3NzA1NH0.jtR2FZy2Y618tLABo-1Tn8rnpmB6KWPLqVmNaEZJWNM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
