param(
    [string]$OutputDirectory = "./backups"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

if (Test-Path "./leakguard.db") {
    Copy-Item "./leakguard.db" (Join-Path $OutputDirectory "leakguard-$timestamp.db")
    Write-Output "SQLite backup created. Store this file somewhere separate from the machine."
} else {
    docker compose exec -T db pg_dump -U leakguard leakguard | Out-File (Join-Path $OutputDirectory "leakguard-$timestamp.sql") -Encoding utf8
    Write-Output "PostgreSQL backup created."
}