$ErrorActionPreference = 'Stop'
$source = 'C:\inetpub\priston'
$dest = 'C:\VelluM\integration-priston'
if (!(Test-Path -LiteralPath $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }
$files = @('index.html','game.html','game.js','game.wasm','data_startup.pack','data_manifest.txt','config.js','progress.js','settings.js','admin.js','sw.js','server_worker.js','ws.ashx','web.config')
foreach ($name in $files) {
  # The optimized ADM/crown/aura client is compiled in web/out.
  # Do not overwrite it with the older static files from the project root.
  $compiled = Join-Path $source ('[project]\\src\\web\\out\\' + $name)
  if ($name -in @('game.js','game.wasm') -and (Test-Path -LiteralPath $compiled)) {
    $f = $compiled
  } else {
    $f = Join-Path $source $name
  }
  if (!(Test-Path -LiteralPath $f)) { throw "missing $name" }
  $target = Join-Path $dest $name
  # Preserve timestamps/ETags for unchanged packs: clients should not re-download 84MB after a re-deploy.
  if ((Test-Path -LiteralPath $target) -and
      (Get-FileHash -LiteralPath $f -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash) { continue }
  Copy-Item -LiteralPath $f -Destination $target -Force
}
# The start-up pack can be served from Cache Storage on repeat visits.
# Avoid telling the player it is downloading when the client is only unpacking cached data.
$progressFile = Join-Path $dest 'progress.js'
$progressText = [IO.File]::ReadAllText($progressFile)
$progressText = $progressText.Replace("show('big', 'Downloading game data', frac, detail,", "show('big', 'Preparando dados do jogo', frac, detail,")
$progressText = $progressText.Replace("pack ? 'Only the first visit (and updates) download this. Later visits load it from your browser.' : ''", "pack ? 'Arquivos ja salvos sao reutilizados. Areas novas podem exigir downloads.' : ''")
$progressText = $progressText.Replace("if (m.rel == 'data_startup.pack') {", "if (m.rel == 'data_startup.pack' || m.rel == 'data_startup.pack.gz') {")
[IO.File]::WriteAllText($progressFile, $progressText, [Text.UTF8Encoding]::new($false))
# Create the compressed start-up asset; the browser falls back to the original on
# engines without DecompressionStream. Keep the original pack for safe rollback.
$fastBootScript = Join-Path $PSScriptRoot 'prepare-classic-fastboot.py'
if (!(Test-Path -LiteralPath $fastBootScript)) { throw 'Classic fast boot script missing' }
& python $fastBootScript $dest
if ($LASTEXITCODE -ne 0) { throw 'Classic compressed pack preparation failed' }
& node --check (Join-Path $dest 'game.js')
if ($LASTEXITCODE -ne 0) { throw 'Classic compiled loader syntax invalid' }
# Use the tested streaming Service Worker and background warmup from this repository.
$optimizedSw = Join-Path $PSScriptRoot 'priston-classic-sw.js'
$warmup = Join-Path $PSScriptRoot 'priston-prewarm.js'
if (!(Test-Path -LiteralPath $optimizedSw) -or !(Test-Path -LiteralPath $warmup)) {
  throw 'Missing optimized VelluM Classic assets in the ops directory.'
}
Copy-Item -LiteralPath $optimizedSw -Destination (Join-Path $dest 'sw.js') -Force
Copy-Item -LiteralPath $warmup -Destination (Join-Path $dest 'prewarm.js') -Force
$warmWorker = Join-Path $PSScriptRoot 'priston-prewarm-worker.js'
$areaBuilder = Join-Path $PSScriptRoot 'build-classic-area-packs.py'
if (!(Test-Path -LiteralPath $warmWorker) -or !(Test-Path -LiteralPath $areaBuilder)) {
  throw 'Background area pack tools are missing from the repository.'
}
Copy-Item -LiteralPath $warmWorker -Destination (Join-Path $dest 'prewarm-worker.js') -Force
& python $areaBuilder $dest
if ($LASTEXITCODE -ne 0) { throw 'Classic area pack preparation failed' }
& node --check (Join-Path $dest 'prewarm-worker.js')
if ($LASTEXITCODE -ne 0) { throw 'Classic background worker syntax error' }
# Full-browser viewport, preserving the native 4:3 playfield, plus real fullscreen toggle.
$fullCss = Join-Path $PSScriptRoot 'priston-fullscreen.css'
$fullJs = Join-Path $PSScriptRoot 'priston-fullscreen.js'
if (!(Test-Path -LiteralPath $fullCss) -or !(Test-Path -LiteralPath $fullJs)) {
  throw 'Fullscreen UI assets are missing.'
}
Copy-Item -LiteralPath $fullCss -Destination (Join-Path $dest 'fullscreen.css') -Force
Copy-Item -LiteralPath $fullJs -Destination (Join-Path $dest 'fullscreen.js') -Force
& node --check (Join-Path $dest 'fullscreen.js')
if ($LASTEXITCODE -ne 0) { throw 'Fullscreen UI script is invalid' }
$data = Join-Path $dest 'data'
if (!(Test-Path -LiteralPath $data)) {
  New-Item -ItemType Junction -Path $data -Target (Join-Path $source 'data') | Out-Null
}
$base = [IO.File]::ReadAllText((Join-Path $dest 'index.html'))
$base = $base.Replace('<title>Priston Tale</title>', '<title>VelluM Priston Tale | Classic Engine</title>')
$wasmFingerprint = (Get-FileHash -LiteralPath (Join-Path $dest 'game.wasm') -Algorithm SHA256).Hash.Substring(0,12).ToLowerInvariant()
$base = $base.Replace('src=game.js async', ('src=game.js?v=' + $wasmFingerprint + ' async'))
$base = $base.Replace('</head>', '<link rel="stylesheet" href="fullscreen.css"></head>')
$base = $base.Replace('</body>', '<script src="fullscreen.js"></script></body>')
$base = $base.Replace('</head><body>', '<style>body{--bg:#091411;--fg:#f4e5c6;--panel:#142521}#wrap::before{content:"VelluM PRISTON TALE | CLASSIC ENGINE";display:block;width:min(1024px,100%);color:#dfbd77;font:700 18px/1.5 system-ui;text-align:center;letter-spacing:2px;padding:4px}#bar button{border-color:#625135}#canvas{border:1px solid #564629}#vellum-tools{width:min(1024px,100%);display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:#e1c991;font:12px system-ui;margin-bottom:5px}#vellum-tools a{color:#f1d58b}#vellum-tools small{color:#aaa}</style></head><body>')
$base = $base.Replace('<div id=wrap>', '<div id=wrap><div id=vellum-tools><span>VelluM Lab - Novo Motor</span><a href="https://acesso.gbtechnology.com.br/priston/" target="_blank" rel="noopener noreferrer">Abrir VelluM anterior</a><small>Personagens antigos ainda nao migrados</small></div>')
$base = $base.Replace('<script src=progress.js></script>', '<script src=progress.js></script><script src=prewarm.js></script>')
[IO.File]::WriteAllText((Join-Path $dest 'index.html'),$base,[Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath (Join-Path $dest 'index.html') -Destination (Join-Path $dest 'game.html') -Force
Import-Module WebAdministration
if (!(Get-Website -Name 'VelluM Priston Lab' -ErrorAction SilentlyContinue)) {
  New-Website -Name 'VelluM Priston Lab' -Port 8095 -IPAddress '127.0.0.1' -PhysicalPath $dest -ApplicationPool 'DefaultAppPool' | Out-Null
}
$site = Get-Website -Name 'VelluM Priston Lab'
if ($site.State -ne 'Started') { Start-Website -Name 'VelluM Priston Lab' }
"PATH=$dest"
"DATA_LINK=$((Get-Item -LiteralPath $data).LinkType)"
"WEBSITE=$((Get-Website -Name 'VelluM Priston Lab').State)"