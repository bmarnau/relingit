param(
    [ValidateRange(0, 9999)]
    [int]$PageCount = 0,
    [string]$Suffix = ""
)

# Einziger vorgesehener Ablauf für eine neue Story-Version:
# source prüfen -> lokale Veröffentlichung aktualisieren -> FTP-Paket bauen.
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

$sourceHtml = "source/fahrt-zum-kunden.html"
$sourcePdf = "source/Die-Fahrt-zum-Kunden.pdf"
$storyHtml = "story/current/fahrt-zum-kunden.html"
$storyPdf = "story/current/geschichte.pdf"

foreach ($file in @($sourceHtml, $sourcePdf)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        throw "Neue Quelldatei fehlt: $file"
    }
}

$html = Get-Content -Raw -LiteralPath $sourceHtml
$meta = [regex]::Match($html, '<div\s+class="cover-meta">(?<content>[\s\S]*?)</div>')
$versionMatch = [regex]::Match($meta.Groups['content'].Value, '<span>\s*Version\s+(?<version>\d+\.\d+)\s*</span>')
$dateMatch = [regex]::Match($meta.Groups['content'].Value, '<span>\s*(?<date>\d{2}\.\d{2}\.\d{4})\s*</span>')
$historyRows = [regex]::Matches(
    $html,
    '<tr>\s*<td>(?<version>\d+\.\d+)</td>\s*<td>(?<date>\d{2}\.\d{2}\.\d{4})</td>',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)
if (-not $meta.Success -or -not $versionMatch.Success -or -not $dateMatch.Success -or $historyRows.Count -eq 0) {
    throw "Version oder Datum der neuen HTML-Datei ist nicht eindeutig lesbar."
}

$version = $versionMatch.Groups['version'].Value
$numericVersion = [version]$version
$latestHistory = $historyRows[$historyRows.Count - 1]
$historyVersions = @($historyRows | ForEach-Object { [version]$_.Groups['version'].Value })
$highestVersion = $historyVersions | Sort-Object -Descending | Select-Object -First 1
if ($numericVersion -ne $highestVersion) {
    throw "Deckblatt-Version $version ist nicht die höchste Version der Historie ($highestVersion)."
}
if ($latestHistory.Groups['version'].Value -ne $version) {
    throw "Der letzte Historieneintrag gehört nicht zu Version $version."
}
if ($latestHistory.Groups['date'].Value -ne $dateMatch.Groups['date'].Value) {
    throw "Deckblatt-Datum und Datum des letzten Historieneintrags widersprechen sich."
}
if ($html -match 'fonts\.(?:googleapis|gstatic)\.com') {
    throw "Die neue HTML-Datei enthält einen externen Google-Fonts-Aufruf."
}

$pdfStream = [System.IO.File]::OpenRead((Resolve-Path $sourcePdf))
try {
    $header = New-Object byte[] 5
    [void]$pdfStream.Read($header, 0, 5)
    if ([System.Text.Encoding]::ASCII.GetString($header) -ne "%PDF-") {
        throw "Die neue PDF-Datei besitzt keine gültige PDF-Kennung."
    }
} finally { $pdfStream.Dispose() }

# Wenn pdfinfo vorhanden ist, wird die Seitenzahl direkt aus der neuen PDF
# gelesen. Damit kann keine alte oder versehentlich geschätzte Zahl in die LP.
$pdfInfoCommand = Get-Command pdfinfo -ErrorAction SilentlyContinue
if ($pdfInfoCommand) {
    $pdfInfo = & $pdfInfoCommand.Source $sourcePdf
    $pageMatch = [regex]::Match(($pdfInfo -join "`n"), '(?m)^Pages:\s+(?<count>\d+)\s*$')
    if (-not $pageMatch.Success) { throw "PDF-Seitenzahl konnte nicht gelesen werden." }
    $detectedPageCount = [int]$pageMatch.Groups['count'].Value
    if ($PageCount -gt 0 -and $PageCount -ne $detectedPageCount) {
        throw "Angegebene Seitenzahl $PageCount widerspricht der PDF ($detectedPageCount)."
    }
    $PageCount = $detectedPageCount
} elseif ($PageCount -eq 0) {
    throw "pdfinfo fehlt. Bitte Seitenzahl ersatzweise mit -PageCount angeben."
}

$culture = [System.Globalization.CultureInfo]::GetCultureInfo('de-DE')
$releaseDate = [datetime]::ParseExact($dateMatch.Groups['date'].Value, 'dd.MM.yyyy', $culture)
$displayDate = $releaseDate.ToString('d. MMMM yyyy', $culture)

# Erst nach allen Eingangsprüfungen werden die öffentlichen Dateien ersetzt.
Copy-Item -LiteralPath $sourceHtml -Destination $storyHtml -Force
Copy-Item -LiteralPath $sourcePdf -Destination $storyPdf -Force

$appPath = "assets/js/app.js"
$app = Get-Content -Raw -LiteralPath $appPath
$app = [regex]::Replace($app, '(fallbackRelease\s*=\s*\{[\s\S]*?version:\s*")[^"]+("[\s\S]*?date:\s*")[^"]+("[\s\S]*?pageCount:\s*)\d+', "`${1}$version`${2}$displayDate`${3}$PageCount", 1)
Set-Content -LiteralPath $appPath -Value $app -Encoding utf8 -NoNewline

$readerPath = "lesen.html"
$reader = Get-Content -Raw -LiteralPath $readerPath
$reader = [regex]::Replace($reader, '(<strong\s+id="story-release">)Version\s+[^<]+(</strong>)', "`${1}Version $version · $displayDate`${2}", 1)
Set-Content -LiteralPath $readerPath -Value $reader -Encoding utf8 -NoNewline

& "$PSScriptRoot/ci-check.ps1"

# Alte FTP-Pakete bleiben wiederherstellbar, werden aber aus dem Upload-Ordner
# entfernt. So kann nicht versehentlich eine frühere ZIP-Datei gewählt werden.
$ftpOutput = Join-Path $projectRoot "output/ftp"
$oldPackages = @(Get-ChildItem -LiteralPath $ftpOutput -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like 'relingit-upload-v*' })
if ($oldPackages.Count -gt 0) {
    $archiveStamp = [datetime]::Now.ToString('yyyyMMdd-HHmmss-fff')
    $packageArchive = Join-Path $projectRoot "archive/ftp-packages/$archiveStamp"
    New-Item -ItemType Directory -Path $packageArchive -Force | Out-Null
    foreach ($oldPackage in $oldPackages) {
        Move-Item -LiteralPath $oldPackage.FullName -Destination $packageArchive
    }
}

& "$PSScriptRoot/build-upload.ps1" -Suffix $Suffix

Write-Host "OK: Version $version vom $displayDate mit $PageCount Seiten veröffentlicht und paketiert."
