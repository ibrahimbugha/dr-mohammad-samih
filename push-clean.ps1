Set-Location $PSScriptRoot
Write-Host "Pushing clean workspace to GitHub..." -ForegroundColor Cyan

# Remove git lock if exists
$lock = Join-Path $PSScriptRoot ".git\index.lock"
if (Test-Path $lock) { Remove-Item $lock -Force; Write-Host "Removed git lock file" -ForegroundColor Yellow }

$env:GIT_MERGE_AUTOEDIT = "no"

# Stage all changes
git add -A

# Pull remote first
git pull --no-edit origin main 2>&1 | Write-Host

# Commit
$status = git status --porcelain
if ($status) {
    git commit -m "Reorganise: static HTML deploy, clean workspace, fix netlify.toml"
    Write-Host "Committed changes." -ForegroundColor Yellow
} else {
    Write-Host "Nothing new to commit." -ForegroundColor Gray
}

# Push
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Netlify will now deploy index.html as a static site." -ForegroundColor Green
    Write-Host "No build step - should deploy in ~10 seconds." -ForegroundColor Green
    Write-Host "Check: https://app.netlify.com/projects/orthodontic-analysis/deploys" -ForegroundColor Cyan
} else {
    Write-Host "Push failed - see error above." -ForegroundColor Red
}
Read-Host "Press Enter to close"
