# Yerel portre havuzu (internet gerekir). Örnek: .\tools\generate-portraits.ps1 -Count 40
param([int]$Count = 40, [double]$Delay = 0.6)
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$out = Join-Path $root "assets\portraits"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$eth = @('African American man','Turkish man','Japanese man','Irish man','Nigerian man','Colombian man','Russian man','Italian man')
$jersey = @('blue white basketball jersey','green basketball jersey','red white basketball jersey','black athletic shirt','grey hoodie')
$ok = 0
for ($i = 0; $i -lt $Count; $i++) {
  $name = "p_{0:D4}.jpg" -f $i
  $path = Join-Path $out $name
  if ((Test-Path $path) -and ((Get-Item $path).Length -gt 8000)) { $ok++; continue }
  $e = $eth[$i % $eth.Count]
  $j = $jersey[[math]::Floor($i / 3) % $jersey.Count]
  $prompt = "professional basketball player portrait headshot, $e, $j, neutral light gray studio background, photorealistic, front facing, chest up, no text"
  $seed = 10000 + $i * 7919
  $url = "https://image.pollinations.ai/prompt/$([uri]::EscapeDataString($prompt))?seed=$seed&width=256&height=320&nologo=true"
  try {
    Invoke-WebRequest -Uri $url -OutFile $path -TimeoutSec 120 -Headers @{ 'User-Agent' = 'Mozilla/5.0 Charazay/1.0' }
    if ((Get-Item $path).Length -gt 3000) { $ok++; Write-Host "ok $name" } else { Remove-Item $path -Force -ErrorAction SilentlyContinue }
  } catch { Write-Host "fail $name : $_" }
  Start-Sleep -Seconds $Delay
}
@{ version = 1; count = $Count } | ConvertTo-Json | Set-Content (Join-Path $out "manifest.json") -Encoding UTF8
Write-Host "done $ok / $Count"
