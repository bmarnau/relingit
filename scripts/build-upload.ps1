param(
    [string]$Suffix = ""
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
$suffixPart = if ([string]::IsNullOrWhiteSpace($Suffix)) { "" } else { "-$Suffix" }
$packageName = "relingit-upload-v$version-$dateStamp$suffixPart"
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

# Die Kontrolle liest das fertige ZIP erneut ein. Jede enthaltene Nutzdatei muss
# bytegenau ihrer aktuellen Quelle entsprechen; fehlende oder zusätzliche
# Dateien führen zum Abbruch.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $expectedEntries = @($publicFiles | ForEach-Object { $_.Replace('\', '/') }) + "UPLOAD-MANIFEST.txt"
    $actualEntries = @($archive.Entries | Where-Object { -not $_.FullName.EndsWith('/') } | ForEach-Object FullName)
    $missingEntries = @($expectedEntries | Where-Object { $_ -notin $actualEntries })
    $extraEntries = @($actualEntries | Where-Object { $_ -notin $expectedEntries })
    if ($missingEntries.Count -gt 0 -or $extraEntries.Count -gt 0) {
        throw "ZIP-Inhalt weicht ab. Fehlend: $($missingEntries -join ', '); zusätzlich: $($extraEntries -join ', ')"
    }

    foreach ($relativePath in $publicFiles) {
        $entryName = $relativePath.Replace('\', '/')
        $entry = $archive.GetEntry($entryName)
        $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $projectRoot $relativePath)).Hash
        $stream = $entry.Open()
        try {
            $zipHash = (Get-FileHash -Algorithm SHA256 -InputStream $stream).Hash
        } finally {
            $stream.Dispose()
        }
        if ($sourceHash -ne $zipHash) {
            throw "ZIP-Datei ist nicht identisch mit der Quelle: $relativePath"
        }
    }
} finally {
    $archive.Dispose()
}

$zipHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash
Write-Host "OK: geprüftes Upload-Paket erstellt: $zipPath"
Write-Host "OK: $($publicFiles.Count) aktuelle Quelldateien bytegenau im ZIP bestätigt."
Write-Host "SHA-256 des ZIP: $zipHash"
