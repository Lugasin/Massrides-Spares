$files = Get-ChildItem "supabase\migrations\*.sql"
foreach ($f in $files) {
    $v = $f.Name.Split('_')[0]
    Write-Host "Repairing local version $v..."
    cmd /c "npx supabase migration repair --status applied $v"
}
