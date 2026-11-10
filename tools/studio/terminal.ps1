$ErrorActionPreference='Stop'
$siteRoot=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$runtime=Join-Path $siteRoot '.website-studio\runtime'
if(Test-Path -LiteralPath (Join-Path $runtime 'node.exe')) { $env:PATH=$runtime+';'+(Join-Path $runtime 'node_modules\.bin')+';'+$env:PATH }
Start-Process -FilePath $env:ComSpec -ArgumentList '/k','title Website Studio Terminal' -WorkingDirectory $siteRoot
