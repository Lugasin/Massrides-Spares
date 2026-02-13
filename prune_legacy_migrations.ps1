$versions = @(
    "20250819055846",
    "20250819055850",
    "20250819111902",
    "20250822000000",
    "20250822133000",
    "20250916134040",
    "20250916134120",
    "20250916134205",
    "20250916134230",
    "20250917060047",
    "20250917060136",
    "20250917060209",
    "20250917060233",
    "20250917060303",
    "20250917060338",
    "20250917060421",
    "20250917060432",
    "20250917060458",
    "20250918061307",
    "20250918061335",
    "20250922000000",
    "20250922000001"
)

Write-Host "Reverting $($versions.Count) legacy versions..."
foreach ($v in $versions) {
    Write-Host "Reverting $v..."
    $proc = Start-Process -FilePath "npx" -ArgumentList "supabase", "migration", "repair", "--status", "reverted", $v -NoNewWindow -PassThru -Wait
    if ($proc.ExitCode -ne 0) {
        Write-Host "Failed to revert $v" -ForegroundColor Red
    }
}
Write-Host "Done."
