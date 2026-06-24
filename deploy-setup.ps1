# ── Orthodontic App — Push to GitHub ─────────────────────────────────────────
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=== Orthodontic App — GitHub Push ===" -ForegroundColor Cyan
Write-Host ""

# ── 1. Force-remove old .git using cmd (handles locked files) ─────────────────
if (Test-Path ".git") {
    Write-Host "Removing old .git folder..." -ForegroundColor Yellow
    cmd /c "rmdir /s /q .git"
    Start-Sleep -Milliseconds 500
}

# ── 2. Init git ────────────────────────────────────────────────────────────────
Write-Host "Initialising git..." -ForegroundColor Cyan
git init -b main
git config user.email "ibrahimbugha@gmail.com"
git config user.name "Ibrahim Bugha"

# ── 3. Commit all files ────────────────────────────────────────────────────────
git add .
git commit -m "Initial commit: orthodontic photo analysis app"
Write-Host "✓ Files committed" -ForegroundColor Green

# ── 4. Push to GitHub ─────────────────────────────────────────────────────────
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git remote add origin https://github.com/ibrahimbugha/orthodontic-analysis.git
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Done! Code is on GitHub." -ForegroundColor Green
    Write-Host "  https://github.com/ibrahimbugha/orthodontic-analysis" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Push failed — you may need to log in to GitHub in a browser first," -ForegroundColor Red
    Write-Host "or run: git config --global credential.helper manager" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
