# Die Fahrt zum Kunden

Landingpage und Online-Lesefassung der fortlaufenden Kurzgeschichte von Bernd Marnau.

## Neue Version veröffentlichen

1. Die neue PDF als `geschichte.pdf` ablegen und die vorhandene Datei ersetzen.
2. Die neue HTML-Lesefassung als `fahrt-zum-kunden.html` ablegen und die vorhandene Datei ersetzen.
3. In `app.js` nur `version` und `date` aktualisieren.
4. Die Seite lokal prüfen und anschließend veröffentlichen.

Die Landingpage bleibt dadurch unverändert; alle Links zeigen dauerhaft auf dieselben Dateinamen.

## Rückmeldungen mit Supabase

1. Im Supabase-Dashboard den SQL Editor öffnen und `supabase/setup.sql` ausführen.
2. In `supabase-config.js` die Project URL und den öffentlichen Publishable Key eintragen.
3. Niemals einen Secret- oder Service-Role-Key in diese Website eintragen.

Anonyme Besucher dürfen danach ausschließlich neue Rückmeldungen anlegen. Sie können keine Einträge lesen, ändern oder löschen. Das Formular fragt keine Kontaktdaten ab. Vor einer stark beworbenen Veröffentlichung sollte zusätzlich serverseitiger Spam-Schutz oder Rate-Limiting ergänzt werden.

## Lokale Vorschau

Die Website ist statisch und kann mit jedem lokalen Webserver ausgeliefert werden. Einstiegspunkt ist `index.html`.

## Lokale Arbeitskopie aktuell halten

Dieses Verzeichnis verfolgt `origin/main` des GitHub-Repositorys. Vor der Arbeit `repo-aktualisieren.ps1` per Rechtsklick **Mit PowerShell ausführen** starten. Das Skript verwendet nur einen Fast-Forward-Pull und stoppt bei lokalen, noch nicht gesicherten Änderungen, damit nichts überschrieben wird.

Nach eigenen Änderungen werden diese zuerst committed und anschließend zu GitHub gepusht. Erst nach dem ersten Commit der hier neu erstellten Dateien ist die Arbeitskopie wieder vollständig sauber und kann mit dem Aktualisierungsskript synchronisiert werden.

## Continuous Integration

GitHub Actions führt bei jedem Push auf `main`, bei Pull Requests und manuell die Workflow-Datei `.github/workflows/ci.yml` aus. Geprüft werden Pflichtdateien, lokale HTML-Verweise, doppelte IDs, PDF-Kennung, JavaScript-Syntax, Git-Whitespace und versehentlich eingecheckte Supabase-Secret-Keys. Der öffentliche Publishable Key ist zulässig; Secret- und Service-Role-Keys sind es nicht.
