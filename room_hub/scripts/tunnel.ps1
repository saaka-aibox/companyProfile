# Starts a free Cloudflare quick tunnel to the local room_hub (port 3011) and prints the public https URL.
# Usage:  npm run tunnel      (room_hub must already be running: npm run dev)
param([int]$Port = 3011)

$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cf) {
  Write-Host "cloudflared not found. Install once with:" -ForegroundColor Yellow
  Write-Host "  winget install --id Cloudflare.cloudflared" -ForegroundColor Yellow
  Write-Host "Then open a NEW terminal and run: npm run tunnel"
  exit 1
}

try { Invoke-RestMethod "http://localhost:$Port/health" -TimeoutSec 3 | Out-Null }
catch { Write-Host "room_hub is not answering on port $Port. Run 'npm run dev' in another terminal first." -ForegroundColor Red; exit 1 }

Write-Host "Starting tunnel... paste the https://*.trycloudflare.com link into 'Server settings' on the website." -ForegroundColor Cyan
Write-Host "Keep this window open; closing it stops the tunnel (the link changes each run)."
& cloudflared tunnel --url "http://localhost:$Port" --no-autoupdate
