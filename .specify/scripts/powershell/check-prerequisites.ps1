# Check that the host has everything Spec Kit needs.
# Usage: .\.specify\scripts\powershell\check-prerequisites.ps1

$ok = $true

function Test-Cmd {
    param([string]$Cmd, [string]$Hint)
    $found = Get-Command $Cmd -ErrorAction SilentlyContinue
    if ($found) {
        $version = (& $Cmd --version 2>&1 | Select-Object -First 1)
        Write-Host ("  [ok]    {0,-12} {1}" -f $Cmd, $version)
    }
    else {
        Write-Host ("  [MISS]  {0,-12} {1}" -f $Cmd, $Hint) -ForegroundColor Yellow
        $script:ok = $false
    }
}

Write-Host "Checking Spec Kit prerequisites..."
Test-Cmd "yarn" "install Yarn 1.x (corepack enable)"
Test-Cmd "node" "install Node.js 24+"
Test-Cmd "git"  "install Git"

# The repository needs Node.js 24 or newer (package.json engines, .nvmrc).
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeMajor = [int](& node -p "process.versions.node.split('.')[0]")
    if ($nodeMajor -lt 24) {
        Write-Host ("  [OLD]   {0,-12} {1}" -f "node", "Node.js $(& node --version) found; install Node.js 24+") -ForegroundColor Yellow
        $ok = $false
    }
}

if ($ok) {
    Write-Host ""
    Write-Host "All prerequisites present."
}
else {
    Write-Host ""
    Write-Error "Some prerequisites missing -- see hints above."
    exit 1
}
