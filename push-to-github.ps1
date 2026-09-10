Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Pushing LBM Mirror Web App & Desktop EXE to GitHub... " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
& "C:\Users\lc122\AppData\Local\Programs\Git\cmd\git.exe" push -u origin main
