$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$studioURL = 'http://127.0.0.1:4317/studio/'
try {
    try { $health = Invoke-RestMethod 'http://127.0.0.1:4317/api/health' -TimeoutSec 2 } catch { $health = $null }
    if ($health -and ($health.app -ne 'Toran Website Studio' -or $health.root -ne $siteRoot)) { throw 'Port 4317 is being used by another editor. Close that editor before opening this website.' }
    if (-not $health) {
        $portableNode = Join-Path $siteRoot '.website-studio\runtime\node.exe'
        if (Test-Path -LiteralPath $portableNode) { $nodePath = $portableNode }
        else { $nodePath = (Get-Command node -ErrorAction Stop).Source }
        $privateDir = Join-Path $siteRoot '.website-studio'
        New-Item -ItemType Directory -Force -Path $privateDir | Out-Null
        $serverFile = Join-Path $PSScriptRoot 'server.mjs'
        Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverFile + '"') -WorkingDirectory $siteRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $privateDir 'server.log') -RedirectStandardError (Join-Path $privateDir 'server-error.log')
        $ready = $false
        for ($attempt=0; $attempt -lt 30; $attempt++) {
            Start-Sleep -Milliseconds 300
            try { $health = Invoke-RestMethod 'http://127.0.0.1:4317/api/health' -TimeoutSec 1; $ready = $health.app -eq 'Toran Website Studio'; if ($ready) { break } } catch {}
        }
        if (-not $ready) { throw ('The editor could not start. Details are in ' + (Join-Path $privateDir 'server-error.log')) }
    }
    Start-Process $studioURL
} catch {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message, 'Website Studio') | Out-Null
    exit 1
}
