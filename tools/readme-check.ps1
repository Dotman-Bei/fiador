# README conformance check (references/readme-schemas.md): R2-contract-protocol v1, no event overlay, Roadmap present.
# Run from the repo root: powershell -NoProfile -ExecutionPolicy Bypass -File tools/readme-check.ps1
$want = @('# Fiador','## Demo','## What it does','## Quickstart','## Built at NEAR HACKATHON','## Contract addresses','## How it works','## Security notes','## Build & test','## Deploy','## Roadmap','## License')
$stamp = '<!-- readme-schema: R2-contract-protocol v1 -->'
$lines = Get-Content README.md -Encoding UTF8
$inFence = $false
$got = foreach ($l in $lines) {
  if ($l -match '^```') { $inFence = -not $inFence }
  elseif (-not $inFence -and $l -cmatch '^#{1,2} ') { $l } }
$ok = ($got.Count -eq $want.Count)
if ($ok) { for ($i = 0; $i -lt $want.Count; $i++) { if ($got[$i] -cne $want[$i]) { $ok = $false } } }
if ($ok -and ($lines[0] -ceq $stamp)) { 'PASS' } else { 'FAIL' }
