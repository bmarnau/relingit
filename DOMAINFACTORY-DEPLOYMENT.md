# Manueller Upload zu DomainFactory

Die Landingpage wird bewusst manuell per FTP auf den DomainFactory-Webspace kopiert. GitHub führt nur die automatischen Qualitätsprüfungen aus und nimmt kein Deployment vor.

## Einmaliger Erst-Upload

Folgende Dateien und Ordner in das Zielverzeichnis der Domain kopieren:

- `index.html`
- `styles.css`
- `legal.css`
- `app.js`
- `supabase-config.js`
- `admin.html`
- `admin.js`
- `impressum.html`
- `datenschutz.html`
- `fahrt-zum-kunden.html` als lokale Rückfallfassung
- `geschichte.pdf` als lokale Rückfallfassung

Nicht auf den Webspace gehören `.git`, `.github`, `scripts`, Markdown-Dokumente, `supabase/setup.sql`, `repo-aktualisieren.ps1` und die ursprüngliche PDF `Die-Fahrt-zum-Kunden_11.pdf`.

## Vor dem FTP-Upload

1. Die lokale Arbeitskopie mit `repo-aktualisieren.ps1` aktualisieren.
2. Prüfen, dass die CI auf GitHub grün ist.
3. In `supabase-config.js` kontrollieren, dass Project URL und Publishable Key eingetragen sind.
4. Alle orange markierten Pflichtfelder in Impressum und Datenschutz ersetzen.
5. Die Landingpage lokal testen.
6. Die oben genannten Dateien per FTP übertragen.
7. Die öffentliche Domain in einem privaten Browserfenster prüfen.

## Neue Fortsetzung veröffentlichen

Für eine neue Geschichte ist kein weiterer FTP-Upload erforderlich:

1. Auf der veröffentlichten Website `admin.html` öffnen.
2. Mit dem Supabase-Administratorkonto anmelden.
3. Version, Datum und Seitenzahl eintragen.
4. Neue HTML-Lesefassung und PDF auswählen.
5. Veröffentlichen und die öffentliche Landingpage prüfen.

Supabase ersetzt dabei die Dateien unter stabilen Adressen. Ein erneuter FTP-Upload ist nur notwendig, wenn sich Landingpage, Gestaltung, JavaScript, Impressum oder Datenschutz ändern.
