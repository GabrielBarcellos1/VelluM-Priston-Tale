# Run on the existing VelluM Windows host, after version 31 is deployed.
# Changes only the existing Nginx proxy and VelluM supervisor; never restarts Guacamole.
$ErrorActionPreference = 'Stop'
$canonical = 'https://acesso.gbtechnology.com.br/priston'
$conf = 'C:\Guacamole\nginx\default.conf'
$repoHost = 'C:\VelluM\repository\ops\host.py'
$installedHost = 'C:\VelluM\ops\host.py'
$origin = 'C:\VelluM\data\public-origin.json'
$python = 'C:\Users\Usuario\AppData\Local\Programs\Python\Python313\python.exe'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = 'C:\VelluM\backups\priston-route-' + $stamp
[System.IO.Directory]::CreateDirectory($backup) | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Invoke-Nginx([string[]]$NginxArgs) {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $result = & docker exec guacamole-proxy nginx @NginxArgs 2>&1; $code = $LASTEXITCODE }
    finally { $ErrorActionPreference = $previousPreference }
    $result | ForEach-Object { Write-Output $_.ToString() }
    if ($code -ne 0) { throw 'Nginx rejected the configuration or reload.' }
}
function Check-Game([string]$Url) {
    $found = Invoke-RestMethod ($Url + '/api/local/build') -TimeoutSec 20
    if ($found.installation -ne $localBuild.installation -or $found.version -lt 31) { throw 'The route did not reach the expected VelluM server.' }
    return $found
}
$localBuild = Invoke-RestMethod 'http://127.0.0.1:19065/api/local/build' -TimeoutSec 15
if ($localBuild.version -lt 31) { throw 'Deploy mount support before installing this route.' }
$guacBefore = Invoke-WebRequest -UseBasicParsing 'https://acesso.gbtechnology.com.br/guacamole/' -TimeoutSec 20
if ($guacBefore.Content -notmatch 'ng-app="index"') { throw 'Guacamole baseline check failed.' }
Copy-Item -LiteralPath $conf -Destination ($backup + '\default.conf')
Copy-Item -LiteralPath $installedHost -Destination ($backup + '\host.py')
$hadOrigin = Test-Path -LiteralPath $origin
if ($hadOrigin) { Copy-Item -LiteralPath $origin -Destination ($backup + '\public-origin.json') }
$original = [System.IO.File]::ReadAllText($conf)
$block = @'
    # VelluM game, isolated from /guacamole/.
    location = /priston {
        return 308 /priston/;
    }
    location ^~ /priston/ {
        set $priston_backend host.docker.internal:19065;
        proxy_pass http://$priston_backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        client_max_body_size 2m;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_set_header X-Forwarded-Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }

'@
$hostChanged = $false
try {
    if (-not $original.Contains('location ^~ /priston/')) {
        if (-not $original.Contains('    location / {')) { throw 'Unrecognized proxy configuration; left unchanged.' }
        $updated = $original.Replace('    location / {', ($block + "`n    location / {"))
        [System.IO.File]::WriteAllText($conf, $updated, $utf8)
        Invoke-Nginx -NginxArgs @('-t')
        Invoke-Nginx -NginxArgs @('-s','reload')
    }
    Check-Game 'http://127.0.0.1:8081/priston' | ConvertTo-Json -Depth 4
    Check-Game $canonical | ConvertTo-Json -Depth 4
    $publicPage = Invoke-WebRequest -UseBasicParsing ($canonical + '/') -TimeoutSec 20
    if ($publicPage.Content -notmatch '/priston/login.mjs') { throw 'The public login page has incorrect asset paths.' }
    $guacAfter = Invoke-WebRequest -UseBasicParsing 'https://acesso.gbtechnology.com.br/guacamole/' -TimeoutSec 20
    if ($guacAfter.Content -notmatch 'ng-app="index"') { throw 'Guacamole regression check failed.' }
    & $python -X utf8 -c 'import ast,sys; ast.parse(open(sys.argv[1],encoding="utf-8-sig").read())' $repoHost
    if ($LASTEXITCODE -ne 0) { throw 'Invalid supervisor source.' }
    $task = Get-ScheduledTask -TaskName 'VelluM-Hosting'
    if (-not ($task.Actions.Arguments -like '*C:\VelluM\ops\host.py*')) { throw 'Unexpected scheduled task; left unchanged.' }
    [System.IO.File]::WriteAllText($origin, (@{url=$canonical} | ConvertTo-Json), $utf8)
    Copy-Item -LiteralPath $repoHost -Destination $installedHost -Force
    $hostChanged = $true
    Stop-ScheduledTask -TaskName 'VelluM-Hosting'
    Start-ScheduledTask -TaskName 'VelluM-Hosting'
    Write-Output ('Route installed. Backup: ' + $backup)
    Write-Output ('Canonical address: ' + $canonical)
    Write-Output 'Guacamole unchanged; wait for the VelluM health monitor to confirm the canonical address.'
} catch {
    $failure = $_
    [System.IO.File]::WriteAllText($conf, $original, $utf8)
    Invoke-Nginx -NginxArgs @('-t')
    Invoke-Nginx -NginxArgs @('-s','reload')
    if ($hadOrigin) { Copy-Item -LiteralPath ($backup + '\public-origin.json') -Destination $origin -Force }
    elseif (Test-Path -LiteralPath $origin) { Remove-Item -LiteralPath $origin }
    if ($hostChanged) {
        Copy-Item -LiteralPath ($backup + '\host.py') -Destination $installedHost -Force
        Stop-ScheduledTask -TaskName 'VelluM-Hosting'
        Start-ScheduledTask -TaskName 'VelluM-Hosting'
    }
    throw $failure
}

