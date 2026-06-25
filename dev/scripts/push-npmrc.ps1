Set-Location $PSScriptRoot
Write-Host "Adding .npmrc to fix peer deps..." -ForegroundColor Cyan
$env:GIT_MERGE_AUTOEDIT = "no"
git pull --no-edit origin main 2>&1 | Write-Host
git add .npmrc
git commit -m "Add .npmrc: legacy-peer-deps=true for Netlify"
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS!" -ForegroundColor Green
} else {
    Write-Host "Push failed" -ForegroundColor Red
}
Read-Host "Press Enter to close"
