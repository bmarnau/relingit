# Gemeinsame, plattformunabhängige Qualitätsprüfung für lokal und GitHub Actions.
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$failures = [System.Collections.Generic.List[string]]::new()

# Diese Dateien bilden die minimale veröffentlichungsfähige Website.
$requiredFiles = @(
    ".htaccess", "index.html", "lesen.html", "pdf.html", "handout.html", "handout-pdf.html", "admin.html", "impressum.html", "datenschutz.html",
    "story/current/fahrt-zum-kunden.html", "story/current/geschichte.pdf", "story/current/workshop-handout.html", "story/current/workshop-handout.pdf",
    "assets/img/reling-it-logo.svg", "assets/img/favicon.png",
    "assets/css/styles.css", "assets/css/legal.css",
    "assets/js/app.js", "assets/js/admin.js", "assets/js/pdf-viewer.js", "assets/js/story-viewer.js", "assets/js/handout-viewer.js",
    "assets/js/supabase-config.js", "supabase/setup.sql", "supabase/config.toml",
    "supabase/functions/submit-feedback/index.ts", "supabase/tests/security-checks.sql",
    "source/fahrt-zum-kunden.html", "source/Die-Fahrt-zum-Kunden.pdf"
)
foreach ($file in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        $failures.Add("Pflichtdatei fehlt: $file")
    }
}

# Sicherheitsinvarianten: Die folgenden Prüfungen verhindern, dass spätere
# Änderungen MFA, Rate-Limit oder die Viewer-Sandbox unbemerkt abschalten.
$adminText = Get-Content -Raw -LiteralPath "assets/js/admin.js"
$adminHtmlText = Get-Content -Raw -LiteralPath "admin.html"
$feedbackClientText = Get-Content -Raw -LiteralPath "assets/js/app.js"
$setupText = Get-Content -Raw -LiteralPath "supabase/setup.sql"
$edgeText = Get-Content -Raw -LiteralPath "supabase/functions/submit-feedback/index.ts"
$supabaseConfigText = Get-Content -Raw -LiteralPath "supabase/config.toml"
$viewerTexts = @(
    Get-Content -Raw -LiteralPath "lesen.html"
    Get-Content -Raw -LiteralPath "handout.html"
)
if ($adminText -notmatch '/factors/.+/challenge' -or $adminText -notmatch '/factors/.+/verify') {
    $failures.Add("Adminbereich enthält keinen vollständigen MFA-Challenge-/Verify-Ablauf")
}
if ($adminText -notmatch 'authRequest\("/user"\)' -or $adminText -match 'const factors = await authRequest\("/factors"\)') {
    $failures.Add("Adminbereich liest MFA-Faktoren nicht über den unterstützten Benutzer-Endpunkt")
}
if ($adminText -notmatch 'new Blob\(\[qrCode\].+image/svg\+xml') {
    $failures.Add("Adminbereich kann den von Supabase gelieferten SVG-QR-Code nicht sicher anzeigen")
}
if ($adminText -notmatch 'aal2') {
    $failures.Add("Adminbereich prüft den AAL2-Status nicht")
}
if ($adminHtmlText -notmatch 'id="reset-request-form"' -or $adminHtmlText -notmatch 'id="reset-password-form"') {
    $failures.Add("Adminbereich enthält keinen vollständigen Passwort-Rücksetzdialog")
}
if ($adminText -notmatch '/recover\?redirect_to=' -or $adminText -notmatch 'method:\s*"PUT"' -or $adminText -notmatch 'recoveryRedirectUrl') {
    $failures.Add("Adminbereich enthält keinen vollständigen Supabase-Passwort-Rücksetzablauf")
}
if ($setupText -notmatch "auth\.jwt\(\)\s*->>\s*'aal'.*'aal2'") {
    $failures.Add("Supabase-RLS erzwingt AAL2 nicht serverseitig")
}
if ($setupText -notmatch 'revoke all on table public\.reader_feedback from anon, authenticated') {
    $failures.Add("Direkter anonymer Feedbackzugriff ist nicht explizit entzogen")
}
if ($feedbackClientText -match '/rest/v1/reader_feedback' -or $feedbackClientText -notmatch '/functions/v1/submit-feedback') {
    $failures.Add("Feedback läuft nicht ausschließlich über die Edge Function")
}
if ($edgeText -notmatch 'FEEDBACK_HASH_SALT' -or $edgeText -notmatch 'submit_reader_feedback') {
    $failures.Add("Edge Function enthält keinen pseudonymen serverseitigen Rate-Limit-Ablauf")
}
if ($supabaseConfigText -notmatch 'verify_jwt\s*=\s*false') {
    $failures.Add("Öffentliche Feedbackfunktion ist nicht korrekt konfiguriert")
}
foreach ($viewerText in $viewerTexts) {
    if ($viewerText -match 'sandbox="[^"]*allow-scripts') {
        $failures.Add("Viewer erlaubt Skriptausführung in eingebetteten Dokumenten")
    }
}

# Versionsnummer und Veröffentlichungsdatum müssen in Landingpage-Logik,
# Leseansicht und eigentlicher Geschichte denselben Stand ausweisen.
$appText = Get-Content -Raw -LiteralPath "assets/js/app.js"
$readerText = Get-Content -Raw -LiteralPath "lesen.html"
$storyText = Get-Content -Raw -LiteralPath "story/current/fahrt-zum-kunden.html"
$sourceStoryText = Get-Content -Raw -LiteralPath "source/fahrt-zum-kunden.html"

$appRelease = [regex]::Match(
    $appText,
    'fallbackRelease\s*=\s*\{[\s\S]*?version:\s*"(?<version>[^"]+)"[\s\S]*?date:\s*"(?<date>[^"]+)"'
)
$readerRelease = [regex]::Match(
    $readerText,
    'id="story-release"[^>]*>\s*Version\s+(?<version>[^<·]+?)\s*·\s*(?<date>[^<]+?)\s*</strong>'
)
$storyMeta = [regex]::Match(
    $storyText,
    '<div\s+class="cover-meta">(?<content>[\s\S]*?)</div>'
)
$storyDateMatch = if ($storyMeta.Success) {
    [regex]::Match($storyMeta.Groups['content'].Value, '<span>\s*(?<date>\d{2}\.\d{2}\.\d{4})\s*</span>')
} else { [System.Text.RegularExpressions.Match]::Empty }
$storyVersionMatch = if ($storyMeta.Success) {
    [regex]::Match($storyMeta.Groups['content'].Value, '<span>\s*Version\s+(?<version>[^<]+?)\s*</span>')
} else { [System.Text.RegularExpressions.Match]::Empty }

if (-not $appRelease.Success) { $failures.Add("Versionsangabe in assets/js/app.js nicht lesbar") }
if (-not $readerRelease.Success) { $failures.Add("Versionsangabe in lesen.html nicht lesbar") }
if (-not $storyDateMatch.Success -or -not $storyVersionMatch.Success) {
    $failures.Add("Version oder Datum in der HTML-Geschichte nicht lesbar")
}

if ($appRelease.Success -and $readerRelease.Success -and $storyDateMatch.Success -and $storyVersionMatch.Success) {
    $versions = @(
        $appRelease.Groups['version'].Value.Trim(),
        $readerRelease.Groups['version'].Value.Trim(),
        $storyVersionMatch.Groups['version'].Value.Trim()
    ) | Select-Object -Unique
    if ($versions.Count -ne 1) {
        $failures.Add("Versionsnummern widersprechen sich: $($versions -join ', ')")
    }

    $culture = [System.Globalization.CultureInfo]::GetCultureInfo('de-DE')
    $storyDate = [datetime]::ParseExact(
        $storyDateMatch.Groups['date'].Value,
        'dd.MM.yyyy',
        $culture
    ).ToString('d. MMMM yyyy', $culture)
    $dates = @(
        $appRelease.Groups['date'].Value.Trim(),
        $readerRelease.Groups['date'].Value.Trim(),
        $storyDate
    ) | Select-Object -Unique
    if ($dates.Count -ne 1) {
        $failures.Add("Veröffentlichungsdaten widersprechen sich: $($dates -join ', ')")
    }
}

# Die freigegebene Rückfallfassung darf niemals hinter dem eindeutigen Eingang
# unter source zurückbleiben. HTML und PDF müssen bytegenau identisch sein.
foreach ($pair in @(
    @("source/fahrt-zum-kunden.html", "story/current/fahrt-zum-kunden.html"),
    @("source/Die-Fahrt-zum-Kunden.pdf", "story/current/geschichte.pdf")
)) {
    if ((Test-Path -LiteralPath $pair[0]) -and (Test-Path -LiteralPath $pair[1])) {
        $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $pair[0]).Hash
        $publishedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $pair[1]).Hash
        if ($sourceHash -ne $publishedHash) {
            $failures.Add("Veröffentlichungsfassung ist nicht aktuell: $($pair[1]) weicht von $($pair[0]) ab")
        }
    }
}

# Der letzte Eintrag der Versionshistorie muss Deckblatt-Version und -Datum
# entsprechen. So wird eine neue Datei mit altem Deckblatt sofort abgewiesen.
$historyRows = [regex]::Matches(
    $storyText,
    '<tr>\s*<td>(?<version>\d+\.\d+)</td>\s*<td>(?<date>\d{2}\.\d{2}\.\d{4})</td>',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)
if ($historyRows.Count -eq 0) {
    $failures.Add("Versionshistorie in der HTML-Geschichte nicht lesbar")
} elseif ($storyDateMatch.Success -and $storyVersionMatch.Success) {
    $latestHistory = $historyRows[$historyRows.Count - 1]
    if ($latestHistory.Groups['version'].Value -ne $storyVersionMatch.Groups['version'].Value.Trim()) {
        $failures.Add("Deckblatt-Version stimmt nicht mit letztem Historieneintrag überein")
    }
    if ($latestHistory.Groups['date'].Value -ne $storyDateMatch.Groups['date'].Value) {
        $failures.Add("Deckblatt-Datum stimmt nicht mit letztem Historieneintrag überein")
    }
}

# Externe Google-Fonts sind aus Datenschutzgründen nicht zulässig.
$publicMarkupFiles = Get-ChildItem -Path $projectRoot -Recurse -File |
    Where-Object {
        $_.Extension -in '.html','.css' -and
        $_.FullName -notmatch '[\\/](?:archive|output|tmp)[\\/]'
    }
foreach ($file in $publicMarkupFiles) {
    $text = Get-Content -Raw -LiteralPath $file.FullName
    if ($text -match 'fonts\.(?:googleapis|gstatic)\.com') {
        $failures.Add("Extern geladene Google-Schriftart in $($file.FullName.Substring($projectRoot.Length + 1))")
    }
}

# Prüft lokale Verweise und doppelte IDs in sämtlichen HTML-Dateien.
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

# Eine schnelle Signaturprüfung erkennt beschädigte oder falsch benannte PDFs.
foreach ($pdfName in @("story/current/geschichte.pdf", "story/current/workshop-handout.pdf", "source/Die-Fahrt-zum-Kunden.pdf")) {
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

# Öffentliche Publishable Keys sind erlaubt; Secret- und Service-Role-Keys nicht.
$secretPatterns = @(
    'sb_secret_[A-Za-z0-9_-]+',
    'service_role["'']?\s*[:=]\s*["''][^"'']+',
    'ghp_[A-Za-z0-9]{20,}',
    'github_pat_[A-Za-z0-9_]{20,}',
    'AKIA[0-9A-Z]{16}',
    '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'
)
$scanFiles = Get-ChildItem -Path $projectRoot -Recurse -File |
    Where-Object {
        $_.FullName -notmatch '[\\/](?:\.git|archive|output|tmp)[\\/]' -and
        $_.Extension -in '.js','.html','.md','.sql','.json','.yml','.yaml','.toml'
    }
foreach ($file in $scanFiles) {
    $text = Get-Content -Raw -LiteralPath $file.FullName
    # Große eingebettete Bilder können zufällig wie Schlüsselpräfixe aussehen.
    $text = [regex]::Replace($text, 'data:[^"'']+', '[embedded-data-removed]')
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

Write-Host "OK: $($htmlFiles.Count) HTML-Dateien, Version/Datum, lokale Links, PDFs und Secret-Schutz geprüft."
