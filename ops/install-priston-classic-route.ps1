$ErrorActionPreference='Stop'
$conf='C:\Guacamole\nginx\default.conf'
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$backup='C:\VelluM\backups\nginx-before-priston-classic-'+$stamp+'.conf'
$original=[IO.File]::ReadAllText($conf)
Copy-Item -LiteralPath $conf -Destination $backup
$block=@'
    # VelluM Classic Engine lab: isolated, stable path; preserve legacy /priston/.
    location = /priston-classic {
        return 308 /priston-classic/;
    }
    location ^~ /priston-classic/ {
        proxy_pass http://host.docker.internal:8095/;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_read_timeout 360s;
        proxy_send_timeout 360s;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }

'@
function Nginx([string[]]$opts) {
  $previous=$ErrorActionPreference; $ErrorActionPreference='Continue'; try { $res=& docker exec guacamole-proxy nginx @opts 2>&1; $status=$LASTEXITCODE } finally { $ErrorActionPreference=$previous }
  if($status -ne 0){throw 'Nginx rejected command: '+($res -join ' ')}
  $res | ForEach-Object {Write-Output $_.ToString()}
}
$guacBefore=(Invoke-WebRequest 'http://127.0.0.1:8081/guacamole/' -UseBasicParsing -TimeoutSec 15).StatusCode
$legacyBefore=(Invoke-WebRequest 'http://127.0.0.1:8081/priston/' -UseBasicParsing -TimeoutSec 15).StatusCode
if($guacBefore -ne 200 -or $legacyBefore -ne 200){throw 'Baseline not healthy'}
$changed=$false
try {
 if(-not $original.Contains('location ^~ /priston-classic/')){
  if(-not $original.Contains('    location / {')){throw 'No safe insertion point'}
  $updated=$original.Replace('    location / {', $block + '    location / {')
  [IO.File]::WriteAllText($conf,$updated,[Text.UTF8Encoding]::new($false))
  $changed=$true
 }
 Nginx @('-t')
 Nginx @('-s','reload')
 Start-Sleep -Seconds 3
 foreach($url in @('http://127.0.0.1:8081/priston-classic/','http://127.0.0.1:8081/priston-classic/sw.js','http://127.0.0.1:8081/priston-classic/game.wasm','http://127.0.0.1:8081/guacamole/','http://127.0.0.1:8081/priston/')){
   Write-Output ('CHECKING '+$url); $r=Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 25
   Write-Output ('TEST '+$r.StatusCode+' '+$url)
   if($r.StatusCode -ne 200){throw 'Health failed '+$url}
 }
 Write-Output ('SUCCESS BACKUP '+$backup)
}catch{
 $errorMessage=$_.Exception.Message
 if($changed){
  [IO.File]::WriteAllText($conf,$original,[Text.UTF8Encoding]::new($false))
  Nginx @('-t')
  Nginx @('-s','reload')
 }
 throw ('ROLLED_BACK '+$errorMessage)
}