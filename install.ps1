# ============================================================
#   Where My Money Went - Full Setup Script for Windows
#   Run in PowerShell as Administrator
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Where My Money Went - Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
Write-Host "[0/6] Execution policy set" -ForegroundColor Green

function Refresh-Path {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = $machinePath + ";" + $userPath
}

Write-Host ""
Write-Host "[1/6] Checking Chocolatey..." -ForegroundColor Yellow
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "      Installing Chocolatey..." -ForegroundColor Gray
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Refresh-Path
    Write-Host "      Chocolatey installed!" -ForegroundColor Green
} else {
    Write-Host "      Already installed. Skipping." -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/6] Checking Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "      Installing Node.js LTS..." -ForegroundColor Gray
    choco install nodejs-lts -y
    Refresh-Path
    Write-Host "      Node.js installed!" -ForegroundColor Green
} else {
    $v = node --version
    Write-Host "      Already installed: $v" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/6] Checking MySQL..." -ForegroundColor Yellow
if (-not (Get-Command mysql -ErrorAction SilentlyContinue)) {
    Write-Host "      Installing MySQL 8.0..." -ForegroundColor Gray
    choco install mysql -y
    Refresh-Path
    Write-Host "      MySQL installed!" -ForegroundColor Green
} else {
    Write-Host "      Already installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/6] Checking Git..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "      Installing Git..." -ForegroundColor Gray
    choco install git -y
    Refresh-Path
    Write-Host "      Git installed!" -ForegroundColor Green
} else {
    Write-Host "      Already installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "[5/6] Installing VS Code extensions..." -ForegroundColor Yellow

if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
    Write-Host "      Installing VS Code..." -ForegroundColor Gray
    choco install vscode -y
    Refresh-Path
}

$extensions = @(
    "dsznajder.es7-react-js-snippets",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "cweijan.vscode-mysql-client2",
    "mtxr.sqltools",
    "mtxr.sqltools-driver-mysql",
    "christian-kohler.npm-intellisense",
    "eamodio.gitlens",
    "visualstudioexptteam.vscodeintellicode",
    "pkief.material-icon-theme",
    "formulahendry.auto-rename-tag",
    "naumovs.color-highlight",
    "humao.rest-client",
    "mikestead.dotenv",
    "christian-kohler.path-intellisense",
    "oderwat.indent-rainbow",
    "aaron-bond.better-comments",
    "vincaslt.highlight-matching-tag",
    "burkeholland.simple-react-snippets"
)

$total = $extensions.Count
$i = 1
foreach ($ext in $extensions) {
    Write-Host "      [$i/$total] $ext" -ForegroundColor Gray
    code --install-extension $ext --force 2>$null
    $i++
}
Write-Host "      Extensions installed!" -ForegroundColor Green

Write-Host ""
Write-Host "[6/6] Installing npm dependencies..." -ForegroundColor Yellow

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$backendPath = Join-Path $projectRoot "backend"
if (Test-Path $backendPath) {
    Write-Host "      Installing backend packages..." -ForegroundColor Gray
    Push-Location $backendPath
    npm install
    Pop-Location
    Write-Host "      Backend done!" -ForegroundColor Green
} else {
    Write-Host "      WARNING: backend/ folder not found" -ForegroundColor Red
}

$frontendPath = Join-Path $projectRoot "frontend"
if (Test-Path $frontendPath) {
    Write-Host "      Installing frontend packages..." -ForegroundColor Gray
    Push-Location $frontendPath
    npm install
    Pop-Location
    Write-Host "      Frontend done!" -ForegroundColor Green
} else {
    Write-Host "      WARNING: frontend/ folder not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup complete! Next steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Load the database:" -ForegroundColor White
Write-Host "     Get-Content backend\schema.sql | mysql -u root -p" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  2. Create your .env file:" -ForegroundColor White
Write-Host "     Copy-Item backend\.env.example backend\.env" -ForegroundColor DarkCyan
Write-Host "     Then edit backend\.env with your MySQL password + JWT secret" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  3. Generate VAPID keys for push notifications:" -ForegroundColor White
Write-Host "     cd backend" -ForegroundColor DarkCyan
Write-Host "     npm run generate-vapid" -ForegroundColor DarkCyan
Write-Host "     Paste both keys into backend\.env" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  4. Start backend (Terminal 1):" -ForegroundColor White
Write-Host "     cd backend && npm run dev" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  5. Start frontend (Terminal 2):" -ForegroundColor White
Write-Host "     cd frontend && npm run dev" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  6. Open http://localhost:5173 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "  TIP: Restart VS Code and your terminal after" -ForegroundColor DarkYellow
Write-Host "       this script so PATH changes take effect." -ForegroundColor DarkYellow
Write-Host ""
