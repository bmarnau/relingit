# Die Fahrt zum Kunden

Landingpage und Online-Lesefassung der fortlaufenden Kurzgeschichte von Bernd Marnau.

Die öffentliche Landingpage wird bei DomainFactory gehostet. GitHub dient als Quellcode-Repository und CI-Plattform. Supabase übernimmt Leserfeedback, Versionsmetadaten sowie die jeweils aktuelle HTML- und PDF-Fassung.

## Neue Version veröffentlichen

1. Den geschützten Bereich `admin.html` aufrufen und mit dem Supabase-Administratorkonto anmelden.
2. Version, Datum und Seitenzahl eintragen.
3. Neue PDF und HTML-Lesefassung auswählen.
4. Veröffentlichen und anschließend die öffentliche Landingpage prüfen.

Supabase ersetzt die Dateien unter stabilen Adressen und aktualisiert die Versionsangaben. Für eine neue Fortsetzung ist deshalb kein DomainFactory-Upload nötig. Nur Änderungen an der Landingpage selbst werden erneut zu DomainFactory übertragen.

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
