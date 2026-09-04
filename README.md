# Die Fahrt zum Kunden

Landingpage, Online-Lesefassung und Workshop-Handout zur fortlaufenden Kurzgeschichte von Bernd Marnau.

Die öffentliche Landingpage wird manuell per FTP bei DomainFactory gehostet. GitHub dient als Quellcode-Repository und CI-Plattform, führt aber kein Deployment aus. Supabase übernimmt Leserfeedback, Versionsmetadaten sowie die jeweils aktuelle HTML- und PDF-Fassung.

## Projektstruktur

- `assets/css`: gemeinsame Gestaltung und Rechtseiten-Stile
- `assets/img`: RelingIT-Logo und Browser-Symbol
- `assets/js`: öffentliche Logik, PDF-Ansicht, Administration und Supabase-Konfiguration
- `archive`: ausschließlich lokales Archiv für nicht mehr aktive Dateien
- `story/current`: aktuell veröffentlichte lokale Rückfallfassung; entspricht dem Supabase-Pfad `story/current`
- `docs`: redaktionelle, Supabase- und FTP-Anleitungen
- `scripts`: lokale und CI-Prüfungen
- `source`: ursprüngliche Quelldateien, die nicht veröffentlicht werden
- `supabase`: Datenbank- und RLS-Einrichtung
- Projektstamm: ausschließlich öffentlich aufrufbare Seiten, README, Lizenz und Wartungsskript

Inhalte unter `archive/` werden nicht zu GitHub übertragen und dürfen nicht auf den DomainFactory-Webspace kopiert werden. Die genaue Ablageregel steht in `archive/README.md`.

## Neue Version veröffentlichen

1. Den geschützten Bereich `admin.html` aufrufen und mit dem Supabase-Administratorkonto anmelden.
2. Version, Datum und Seitenzahl eintragen.
3. Neue PDF und HTML-Lesefassung auswählen.
4. Falls geändert, das Handout zusätzlich als HTML und PDF auswählen.
5. Veröffentlichen und anschließend die öffentliche Landingpage prüfen.

Vor einem FTP-Upload im Projektordner ausführen:

```powershell
./scripts/build-upload.ps1
```

Der Paketbau prüft verbindlich, dass Versionsnummer und Datum in der lokalen
Fallback-Konfiguration, der Leseansicht und der HTML-Geschichte übereinstimmen.
Das ZIP enthält außerdem `UPLOAD-MANIFEST.txt` mit Version, Datum und
SHA-256-Prüfsummen. Nach dem Packen wird das ZIP erneut geöffnet und jede
enthaltene Nutzdatei bytegenau mit ihrer aktuellen Quelle verglichen. Ein
bereits vorhandenes Paket wird nicht überschrieben;
für eine weitere Ausgabe kann beispielsweise `-Suffix r2` verwendet werden.

Supabase ersetzt die Dateien unter stabilen Adressen und aktualisiert die Versionsangaben. Das Handout liegt dauerhaft unter `workshop-handout.html` und `workshop-handout.pdf`. Für eine neue Fortsetzung ist deshalb kein DomainFactory-Upload nötig. Nur Änderungen an der Landingpage selbst werden erneut zu DomainFactory übertragen.

## Rückmeldungen mit Supabase

1. Im Supabase-Dashboard den SQL Editor öffnen und `supabase/setup.sql` ausführen.
2. In `assets/js/supabase-config.js` die Project URL und den öffentlichen Publishable Key eintragen.
3. Niemals einen Secret- oder Service-Role-Key in diese Website eintragen.

Anonyme Besucher dürfen danach ausschließlich neue Rückmeldungen anlegen. Sie können keine Einträge lesen, ändern oder löschen. Das Formular fragt keine Kontaktdaten ab. Vor einer stark beworbenen Veröffentlichung sollte zusätzlich serverseitiger Spam-Schutz oder Rate-Limiting ergänzt werden.

## Lokale Vorschau

Die Website ist statisch und kann mit jedem lokalen Webserver ausgeliefert werden. Einstiegspunkt ist `index.html`.

## Lokale Arbeitskopie aktuell halten

Dieses Verzeichnis verfolgt `origin/main` des GitHub-Repositorys. Vor der Arbeit `repo-aktualisieren.ps1` per Rechtsklick **Mit PowerShell ausführen** starten. Das Skript verwendet nur einen Fast-Forward-Pull und stoppt bei lokalen, noch nicht gesicherten Änderungen, damit nichts überschrieben wird.

Nach eigenen Änderungen werden diese zuerst committed und anschließend zu GitHub gepusht. Erst nach dem ersten Commit der hier neu erstellten Dateien ist die Arbeitskopie wieder vollständig sauber und kann mit dem Aktualisierungsskript synchronisiert werden.

## Continuous Integration

GitHub Actions führt bei jedem Push auf `main`, bei Pull Requests und manuell die Workflow-Datei `.github/workflows/ci.yml` aus. Geprüft werden Pflichtdateien, die Übereinstimmung von Versionsnummer und Veröffentlichungsdatum, lokale HTML-Verweise, doppelte IDs, PDF-Kennung, JavaScript-Syntax, Git-Whitespace und versehentlich eingecheckte Supabase-Secret-Keys. Der öffentliche Publishable Key ist zulässig; Secret- und Service-Role-Keys sind es nicht.
