$env:FORCE_COLOR = "0"
npx supabase functions deploy get-orders get-user-settings --no-verify-jwt 2>&1 | Out-File deploy.log -Encoding UTF8
