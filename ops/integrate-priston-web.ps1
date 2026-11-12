$ErrorActionPreference = 'Stop'
$source = 'C:\inetpub\priston'
$dest = 'C:\VelluM\integration-priston'
if (!(Test-Path -LiteralPath $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }
$files = @('index.html','game.html','game.js','game.wasm','data_startup.pack','data_manifest.txt','config.js','progress.js','settings.js','admin.js','sw.js','server_worker.js','ws.ashx','web.config')
foreach ($name in $files) {
  $f = Join-Path $source $name
  if (!(Test-Path -LiteralPath $f)) { throw "missing $name" }
  Copy-Item -LiteralPath $f -Destination (Join-Path $dest $name) -Force
}
$data = Join-Path $dest 'data'
if (!(Test-Path -LiteralPath $data)) {
  New-Item -ItemType Junction -Path $data -Target (Join-Path $source 'data') | Out-Null
}
$base = [IO.File]::ReadAllText((Join-Path $dest 'index.html'))
$base = $base.Replace('<title>Priston Tale</title>', '<title>VelluM Priston Tale | Classic Engine</title>')
$base = $base.Replace('</head><body>', '<style>body{--bg:#091411;--fg:#f4e5c6;--panel:#142521}#wrap::before{content:"VelluM PRISTON TALE | CLASSIC ENGINE";display:block;width:min(1024px,100%);color:#dfbd77;font:700 18px/1.5 system-ui;text-align:center;letter-spacing:2px;padding:4px}#bar button{border-color:#625135}#canvas{border:1px solid #564629}#vellum-tools{width:min(1024px,100%);display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:#e1c991;font:12px system-ui;margin-bottom:5px}#vellum-tools a{color:#f1d58b}#vellum-tools small{color:#aaa}</style></head><body>')
$base = $base.Replace('<div id=wrap>', '<div id=wrap><div id=vellum-tools><span>VelluM Lab - Novo Motor</span><a href="https://acesso.gbtechnology.com.br/priston/" target="_blank" rel="noopener noreferrer">Abrir VelluM anterior</a><small>Personagens antigos ainda nao migrados</small></div>')
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