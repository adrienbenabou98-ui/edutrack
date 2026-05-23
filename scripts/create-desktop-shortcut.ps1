$icoPath = Join-Path $PSScriptRoot "..\build\icon.ico" | Resolve-Path
$shortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "EduTrack.lnk"

$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutPath)
$sc.TargetPath = "https://edutrack-production-2a6d.up.railway.app"
$sc.IconLocation = "$icoPath, 0"
$sc.Description = "Open EduTrack"
$sc.Save()

Write-Host "Desktop shortcut created at: $shortcutPath"
