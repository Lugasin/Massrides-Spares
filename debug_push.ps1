$env:FORCE_COLOR = "0"
cmd /c "echo y | npx supabase db push --include-all" 2>&1 | Out-File -FilePath push_debug.log -Encoding UTF8
