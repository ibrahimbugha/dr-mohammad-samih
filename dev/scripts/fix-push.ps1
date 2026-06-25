Set-Location $PSScriptRoot
Write-Host "Fixing git sync..." -ForegroundColor Cyan

# Abort any in-progress merge
git merge --abort 2>$null
git rebase --abort 2>$null

# Stage and stash local changes
git add -A
git stash

# Pull remote commits without opening editor
$env:GIT_MERGE_AUTOEDIT = "no"
git pull --no-edit origin main

# Restore our stashed changes (package-lock.json)
git stash pop

# Stage and commit if anything new
$status = git status --porcelain
if ($status) {
    git add package-lock.json yarn.lock 2>$null
    git commit -m "Add package-lock.json for Netlify build"
}

# Push
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! package-lock.json pushed to GitHub." -ForegroundColor Green
    Write-Host "Netlify will redeploy automatically." -ForegroundColor Green
} else {
    Write-Host "Push still failed - see error above." -ForegroundColor Red
}

Read-Host "Press Enter to close"
