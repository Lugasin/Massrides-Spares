# Get local versions
$localFiles = Get-ChildItem "supabase\migrations\*.sql"
$localVersions = $localFiles | ForEach-Object { $_.Name.Split('_')[0] }

# Get remote versions (cached list)
# Get remote versions (cached list)
# Always refresh to be safe
cmd /c "npx supabase migration list > migration_list_full.txt 2>&1"

$content = Get-Content "migration_list_full.txt"
Write-Host "Migration list has $($content.Count) lines."
if ($content.Count -lt 5) { Write-Host "WARNING: Migration list seems too short!"; $content | Out-String | Write-Host }

# Regex to find timestamp in table
$remoteVersions = $content | Select-String -Pattern "\b202\d{11}\b" -AllMatches | % { $_.Matches.Value.Trim() } | Select-Object -Unique
Write-Host "Found $($remoteVersions.Count) 202* versions matching regex."

# Diff
$toPrune = Compare-Object -ReferenceObject $localVersions -DifferenceObject $remoteVersions -PassThru | Where-Object { $_.SideIndicator -eq "=>" }

if (!$toPrune) {
    Write-Host "No discrepencies found."
}
else {
    Write-Host "Found $($toPrune.Count) versions on remote NOT in local."
    foreach ($v in $toPrune) {
        Write-Host "Pruning $v..."
        cmd /c "npx supabase migration repair --status reverted $v"
    }
}
