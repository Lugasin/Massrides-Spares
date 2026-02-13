$logFile = "migration_list_debug.log"
if (Test-Path $logFile) {
    $content = Get-Content $logFile -Raw
    # Find all occurrences of 2025 followed by digits
    $matches = [regex]::Matches($content, "2025\d{10}")
    
    if ($matches.Count -gt 0) {
        Write-Host "Found $($matches.Count) matches."
        $matches | ForEach-Object { $_.Value } | Select-Object -Unique
    }
    else {
        Write-Host "No regex matches found for '2025\d{10}'."
        # Try looser pattern
        $matchesLoose = [regex]::Matches($content, "2025\d+")
        if ($matchesLoose.Count -gt 0) {
            Write-Host "Found $($matchesLoose.Count) loose matches:"
            $matchesLoose | ForEach-Object { $_.Value } | Select-Object -Unique
        }
    }
}
else {
    Write-Host "Log file $logFile not found."
}
