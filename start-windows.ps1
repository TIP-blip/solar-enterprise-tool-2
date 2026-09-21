Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js is not installed. Install Node.js LTS first.' -ForegroundColor Red
  Read-Host 'Press Enter to close'
  exit 1
}
if (-not (Test-Path node_modules)) {
  npm install --legacy-peer-deps
  if ($LASTEXITCODE -ne 0) { Read-Host 'Install failed. Press Enter to close'; exit $LASTEXITCODE }
}
Write-Host 'Starting ONE INVERTER at http://127.0.0.1:3000' -ForegroundColor Green
npm run dev
