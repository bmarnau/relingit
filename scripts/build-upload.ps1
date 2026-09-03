param(
    [string]$Suffix = "verified"
)

# Erstellt ein geprüftes FTP-Paket ausschließlich aus den öffentlichen Dateien.
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

# Ohne erfolgreiche Qualitäts- und Metadatenprüfung wird kein Paket gebaut.
& "$PSScriptRoot/ci-check.ps1"

$appText = Get-Content -Raw -LiteralPath "assets/js/app.js"
$release = [regex]::Match(
    $appText,
    'fallbackRelease\s*=\s*\{[\s\S]*?version:\s*"(?<version>[^"]+)"[\s\S]*?date:\s*"(?<date>[^"]+)"'
)
if (-not $release.Success) { throw "Version und Datum konnten nicht gelesen werden." }

$version = $release.Groups['version'].Value.Trim()
$culture = [System.Globalization.CultureInfo]::GetCultureInfo('de-DE')
$releaseDate = [datetime]::ParseExact(
    $release.Groups['date'].Value.Trim(),
    'd. MMMM yyyy',
    $culture
)
$dateStamp = $releaseDate.ToString('yyyy-MM-dd')
$packageName = "relingit-upload-v$version-$dateStamp-$Suffix"
$outputRoot = Join-Path $projectRoot "output/ftp"
$packageDirectory = Join-Path $outputRoot $packageName
$zipPath = "$packageDirectory.zip"

if ((Test-Path -LiteralPath $packageDirectory) -or (Test-Path -LiteralPath $zipPath)) {
    throw "Paket existiert bereits: $packageName. Bitte einen anderen -Suffix angeben."
}

$publicFiles = @(
    ".htaccess", "admin.html", "datenschutz.html", "handout-pdf.html",
    "handout.html", "impressum.html", "index.html", "lesen.html", "pdf.html",
    "assets/css/legal.css", "assets/css/styles.css",
    "assets/img/favicon.png", "assets/img/reling-it-logo.svg",
    "assets/js/admin.js", "assets/js/app.js", "assets/js/handout-viewer.js",
    "assets/js/pdf-viewer.js", "assets/js/story-viewer.js",
    "assets/js/supabase-config.js",
    "story/current/fahrt-zum-kunden.html", "story/current/geschichte.pdf",
    "story/current/workshop-handout.html", "story/current/workshop-handout.pdf"
)

New-Item -ItemType Directory -Path $packageDirectory | Out-Null
foreach ($relativePath in $publicFiles) {
    $source = Join-Path $projectRoot $relativePath
    $destination = Join-Path $packageDirectory $relativePath
    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
}

$manifestLines = @(
    "RelingIT FTP-Upload-Paket",
    "Version: $version",
    "Veröffentlichungsdatum: $($release.Groups['date'].Value.Trim())",
    "Erstellt: $([datetime]::Now.ToString('yyyy-MM-dd HH:mm:ss zzz'))",
    "",
    "SHA-256-Prüfsummen:"
)
foreach ($relativePath in $publicFiles) {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $packageDirectory $relativePath)).Hash
    $manifestLines += "$hash  $($relativePath.Replace('\', '/'))"
}
Set-Content -LiteralPath (Join-Path $packageDirectory "UPLOAD-MANIFEST.txt") -Value $manifestLines -Encoding utf8

Compress-Archive -Path (Join-Path $packageDirectory "*") -DestinationPath $zipPath -CompressionLevel Optimal
Write-Host "OK: geprüftes Upload-Paket erstellt: $zipPath"
