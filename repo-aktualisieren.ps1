$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

$changes = git status --porcelain
if ($LASTEXITCODE -ne 0) {
    throw "Git-Status konnte nicht gelesen werden."
}

if ($changes) {
    Write-Host "Aktualisierung gestoppt: Es gibt lokale, noch nicht gesicherte Änderungen." -ForegroundColor Yellow
    Write-Host "Bitte Änderungen zuerst committen oder sichern. Es wurde nichts verändert."
    git status --short
    exit 1
}

Write-Host "Hole den aktuellen Stand von GitHub ..."
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) {
    throw "Aktualisierung fehlgeschlagen. Es wurde keine automatische Zusammenführung durchgeführt."
}

Write-Host "Die lokale Arbeitskopie ist aktuell." -ForegroundColor Green
