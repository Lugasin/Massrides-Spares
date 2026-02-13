$logContent = Get-Content "push_fail_5.log" -Raw
$pattern = "\b(202\d{11})\b"
$foundMatches = [regex]::Matches($logContent, $pattern)
$versions = @($foundMatches) | ForEach-Object { $_.Value } | Select-Object -Unique

if (!$versions -or $versions.Count -eq 0) {
    Write-Host "No versions found in log."
}
else {
    Write-Host "Found $($versions.Count) missing versions."
    
    # Init script content
    $sb = new-object System.Text.StringBuilder
    $null = $sb.AppendLine('$versions = @(')
    foreach ($v in $versions) {
        $null = $sb.AppendLine("`"$v`",")
    }
    $null = $sb.AppendLine(')')
    
    $sb.AppendLine('$baseDir = "supabase\migrations"')
    $sb.AppendLine('if (!(Test-Path $baseDir)) { New-Item -ItemType Directory -Force -Path $baseDir }')
    $sb.AppendLine('foreach ($v in $versions) {')
    $sb.AppendLine('    $fileName = "$baseDir\${v}_remote_auto_placeholder.sql"')
    $sb.AppendLine('    if (!(Test-Path $fileName)) {')
    $sb.AppendLine('        New-Item -ItemType File -Path $fileName -Force | Out-Null')
    $sb.AppendLine('        Set-Content -Path $fileName -Value "-- Auto-generated placeholder for remote migration $v"')
    $sb.AppendLine('        Write-Host "Created $fileName"')
    $sb.AppendLine('    }')
    $sb.AppendLine('}')
    
    Set-Content -Path "create_dummy_migrations_auto.ps1" -Value $sb.ToString()
    Write-Host "Created create_dummy_migrations_auto.ps1 with $($versions.Count) versions."
}
