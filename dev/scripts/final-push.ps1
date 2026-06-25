Set-Location $PSScriptRoot
Write-Host "Fixing Netlify config and pushing..." -ForegroundColor Cyan

# Remove yarn.lock so Netlify uses npm (package-lock.json)
if (Test-Path "yarn.lock") {
    git rm yarn.lock 2>$null
    Remove-Item -Force yarn.lock -ErrorAction SilentlyContinue
    Write-Host "Removed yarn.lock" -ForegroundColor Yellow
}

# Stage netlify.toml fix
git add netlify.toml
git add -A

# Pull latest first to avoid conflicts
$env:GIT_MERGE_AUTOEDIT = "no"
git pull --no-edit origin main 2>&1 | Write-Host

# Commit
$status = git status --porcelain
if ($status) {
    git commit -m "Fix: use npm run build, remove yarn.lock"
}

# Push
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Netlify will now redeploy with npm." -ForegroundColor Green
    Write-Host "Check: https://app.netlify.com/projects/orthodontic-analysis/deploys" -ForegroundColor Green
} else {
    Write-Host "Push failed - see error above." -ForegroundColor Red
}

Read-Host "Press Enter to close"
