$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root='C:\VelluM\integration-priston'
$stage='C:\VelluM\investigation\optimized-ui-icons'
New-Item -ItemType Directory -Path $stage -Force | Out-Null
$items=Get-Content -LiteralPath (Join-Path $root 'items-catalog.json') -Raw -Encoding UTF8|ConvertFrom-Json
$unique=@{};$worked=0;$skipped=0;$failed=0
foreach($item in $items){
  if(-not $item.icon -or $item.icon -notmatch '\.bmp$'){$skipped++;continue}
  $path=[string]$item.icon
  if($unique.ContainsKey($path)){continue}
  $unique[$path]=1
  $rel=$path -replace '^/data/',''
  $src=Join-Path (Join-Path $root 'data') ($rel.Replace('/','\'))
  if(-not (Test-Path -LiteralPath $src)){$failed++;continue}
  $target=Join-Path $stage ([IO.Path]::GetFileNameWithoutExtension($src)+'.png')
  try{
    $bytes=[IO.File]::ReadAllBytes($src)
    if($bytes.Length -lt 54){$failed++;continue}
    $header=[BitConverter]::ToInt32($bytes,14)
    if($header -lt 40 -or $header -gt 124){$failed++;continue}
    $bits=[BitConverter]::ToInt16($bytes,28)
    $palette=[BitConverter]::ToInt32($bytes,46)
    if($bits -le 8 -and $palette -le 0){$palette=1 -shl $bits}
    $offset=14+$header+($palette*4)
    if($offset -gt $bytes.Length){$failed++;continue}
    $size=[BitConverter]::GetBytes([int]$bytes.Length)
    [Array]::Copy([Text.Encoding]::ASCII.GetBytes('BM'),0,$bytes,0,2)
    [Array]::Copy($size,0,$bytes,2,4)
    for($k=6;$k -lt 10;$k++){$bytes[$k]=0}
    [Array]::Copy([BitConverter]::GetBytes([int]$offset),0,$bytes,10,4)
    $memory=[IO.MemoryStream]::new($bytes,$false)
    $image=[System.Drawing.Image]::FromStream($memory,$true,$true)
    $image.Save($target,[System.Drawing.Imaging.ImageFormat]::Png)
    $image.Dispose();$memory.Dispose()
    $worked++
  }catch{$failed++}
}
Write-Output "ICONS_CONVERTED=$worked SKIPPED=$skipped FAILED=$failed TOTAL=$($items.Count)"
$files=Get-ChildItem -LiteralPath $stage -Filter '*.png'
Write-Output "PNG_COUNT=$($files.Count) PNG_BYTES=$(($files|Measure-Object Length -Sum).Sum)"
