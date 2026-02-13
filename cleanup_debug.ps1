Remove-Item db_push_*.log -ErrorAction SilentlyContinue
Remove-Item repair_debug.log -ErrorAction SilentlyContinue
Remove-Item migration_list_check_new.txt -ErrorAction SilentlyContinue
Remove-Item convert_to_utf8.ps1 -ErrorAction SilentlyContinue
Remove-Item remove_bom.ps1 -ErrorAction SilentlyContinue
Remove-Item repair_2025.ps1 -ErrorAction SilentlyContinue
Remove-Item db_push_bom_check.log -ErrorAction SilentlyContinue
Write-Host "Cleanup complete."
