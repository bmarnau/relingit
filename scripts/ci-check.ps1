$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$failures = [System.Collections.Generic.List[string]]::new()

$requiredFiles = @(
    "index.html", "pdf.html", "admin.html", "impressum.html", "datenschutz.html",
    "story/current/fahrt-zum-kunden.html", "story/current/geschichte.pdf",
    "assets/css/styles.css", "assets/css/legal.css",
    "assets/js/app.js", "assets/js/admin.js", "assets/js/pdf-viewer.js",
    "assets/js/supabase-config.js", "supabase/setup.sql"
)
foreach ($file in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        $failures.Add("Pflichtdatei fehlt: $file")
    }
}

$htmlFiles = Get-ChildItem -Path $projectRoot -Filter "*.html" -File -Recurse
foreach ($htmlFile in $htmlFiles) {
    $content = Get-Content -Raw -LiteralPath $htmlFile.FullName
    $relativeHtmlPath = $htmlFile.FullName.Substring($projectRoot.Length + 1)

    $ids = [regex]::Matches($content, '\bid\s*=\s*["'']([^"'']+)["'']') |
        ForEach-Object { $_.Groups[1].Value }
    $duplicates = $ids | Group-Object | Where-Object Count -gt 1
    foreach ($duplicate in $duplicates) {
        $failures.Add("Doppelte ID '$($duplicate.Name)' in $relativeHtmlPath")
    }

    $references = [regex]::Matches($content, '\b(?:href|src)\s*=\s*["'']([^"'']+)["'']')
    foreach ($match in $references) {
        $reference = $match.Groups[1].Value
        if ($reference -match '^(?:https?:|mailto:|tel:|data:|#|javascript:)') { continue }
        $cleanReference = ($reference -split '[?#]')[0]
        if ([string]::IsNullOrWhiteSpace($cleanReference)) { continue }
        $resolved = Join-Path -Path $htmlFile.DirectoryName -ChildPath $cleanReference
        if (-not (Test-Path -LiteralPath $resolved)) {
            $failures.Add("Fehlender lokaler Verweis in ${relativeHtmlPath}: $reference")
        }
    }
}

foreach ($pdfName in @("story/current/geschichte.pdf", "source/Die-Fahrt-zum-Kunden_11.pdf")) {
    if (-not (Test-Path -LiteralPath $pdfName)) { continue }
    $stream = [System.IO.File]::OpenRead((Resolve-Path $pdfName))
    try {
        $header = New-Object byte[] 5
        [void]$stream.Read($header, 0, 5)
        if ([System.Text.Encoding]::ASCII.GetString($header) -ne "%PDF-") {
            $failures.Add("Keine gültige PDF-Kennung: $pdfName")
        }
    } finally { $stream.Dispose() }
}

$secretPatterns = @(
    'sb_secret_[A-Za-z0-9_-]+',
    'service_role["'']?\s*[:=]\s*["''][^"'']+'
)
$scanFiles = Get-ChildItem -Path $projectRoot -Recurse -File |
    Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' -and $_.Extension -in '.js','.html','.md','.sql','.json','.yml','.yaml' }
foreach ($file in $scanFiles) {
    $text = Get-Content -Raw -LiteralPath $file.FullName
    foreach ($pattern in $secretPatterns) {
        if ($text -match $pattern) {
            $failures.Add("Möglicher Supabase-Secret-Key in $($file.FullName.Substring($projectRoot.Length + 1))")
        }
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ -ErrorAction Continue }
    throw "CI-Prüfung mit $($failures.Count) Fehler(n) abgebrochen."
}

Write-Host "OK: $($htmlFiles.Count) HTML-Dateien, lokale Links, PDFs und Secret-Schutz geprüft."
