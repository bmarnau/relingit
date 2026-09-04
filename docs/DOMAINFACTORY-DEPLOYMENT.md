# Manueller Upload zu DomainFactory

Die Landingpage wird bewusst manuell per FTP auf den DomainFactory-Webspace kopiert. GitHub führt nur die automatischen Qualitätsprüfungen aus und nimmt kein Deployment vor.

Die Datei `.htaccess` muss ebenfalls in das Verzeichnis `relingit` übertragen werden. Sie erzwingt HTTPS, verhindert Verzeichnislisten und setzt die Sicherheitsheader der Website.

## Einmaliger Erst-Upload

Folgende Dateien und Ordner in das Zielverzeichnis der Domain kopieren:

- `index.html`
- `.htaccess`
- `lesen.html`
- `handout.html`
- `handout-pdf.html`
- den vollständigen Ordner `assets`
- den vollständigen Ordner `story`
- `pdf.html`
- `admin.html`
- `impressum.html`
- `datenschutz.html`

Nicht auf den Webspace gehören `.git`, `.github`, `archive`, `docs`, `scripts`, `source`, `supabase`, `README.md` und `repo-aktualisieren.ps1`.

## Vor dem FTP-Upload

1. Die lokale Arbeitskopie mit `repo-aktualisieren.ps1` aktualisieren.
2. Prüfen, dass die CI auf GitHub grün ist.
3. Nach Sicherheitsänderungen zuerst sämtliche Aktivierungsschritte in
   `docs/SICHERHEIT.md` und `docs/SUPABASE-ANLEITUNG.md` abschließen.
4. In `assets/js/supabase-config.js` kontrollieren, dass Project URL und Publishable Key eingetragen sind.
5. Alle orange markierten Pflichtfelder in Impressum und Datenschutz ersetzen.
6. Die Landingpage lokal testen.
7. Im FTP-Programm die Anzeige versteckter Dateien aktivieren.
8. Die oben genannten Dateien einschließlich `.htaccess` per FTP übertragen.
9. Die öffentliche Domain in einem privaten Browserfenster prüfen.
10. Mit einem Header-Prüfwerkzeug kontrollieren, dass HSTS, CSP, `nosniff`,
    Referrer-, Frame- und Permissions-Policy tatsächlich ausgeliefert werden.

Bei der Kontrolle am 4. September 2026 fehlten diese Header auf der Live-Seite.
Wenn `.htaccess` auf dem Server vorhanden ist, bitte DomainFactory nach der
Freischaltung von `mod_headers` beziehungsweise erlaubten Headerdirektiven
fragen.

## Neue Fortsetzung veröffentlichen

Für eine neue Geschichte ist kein weiterer FTP-Upload erforderlich:

1. Auf der veröffentlichten Website `admin.html` öffnen.
2. Mit dem Supabase-Administratorkonto anmelden.
3. Den Code der Authenticator-App bestätigen.
4. Version, Datum und Seitenzahl eintragen.
5. Neue HTML-Lesefassung und PDF auswählen.
6. Falls geändert, das Handout als zusammengehöriges HTML/PDF-Paar auswählen.
7. Veröffentlichen und die öffentliche Landingpage prüfen.

Supabase ersetzt dabei die Dateien unter stabilen Adressen. Ein erneuter FTP-Upload ist nur notwendig, wenn sich Landingpage, Gestaltung, JavaScript, Impressum oder Datenschutz ändern.
