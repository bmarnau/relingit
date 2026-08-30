# Supabase Schritt für Schritt einrichten

Die Landingpage selbst wird bei DomainFactory gehostet. Supabase stellt die jeweils aktuelle HTML-/PDF-Fassung bereit und speichert Leserfeedback. GitHub verwaltet den Quellcode und führt die automatischen Prüfungen aus.

## A. Projekt vorbereiten

1. Bei Supabase anmelden und das gewünschte Projekt öffnen.
2. Oben prüfen, in welcher Region das Projekt liegt. Die Region für die Datenschutzerklärung notieren.
3. Links **SQL Editor** öffnen und **New query** wählen.
4. Den vollständigen Inhalt aus `supabase/setup.sql` einfügen.
5. **Run** drücken. Es sollte kein Fehler erscheinen.

Damit wird `reader_feedback` erstellt. Besucher dürfen nur neue Zeilen schreiben. Sie können vorhandene Rückmeldungen nicht sehen, ändern oder löschen.

## B. Ihr Administratorkonto anlegen

1. In Supabase **Authentication → Users** öffnen.
2. **Add user → Create new user** wählen.
3. Ihre E-Mail-Adresse und ein starkes, nur hierfür verwendetes Passwort eintragen. Die E-Mail direkt als bestätigt markieren.
4. Den neu angelegten Benutzer öffnen und seine **User UID** kopieren.
5. Wieder den **SQL Editor** öffnen und einmalig ausführen:

```sql
insert into public.admin_users (user_id)
values ('HIER-IHRE-USER-UID-EINTRAGEN');
```

Nur diese UID darf über `admin.html` neue Dateien einstellen. Weitere Administratoren werden auf dieselbe Weise ergänzt.

## C. Website verbinden

1. In Supabase **Project Settings → API** öffnen.
2. Die **Project URL** kopieren.
3. Den **Publishable key** (`sb_publishable_...`) kopieren. Falls nur ältere Schlüssel angezeigt werden, kann vorübergehend der öffentliche `anon`-Key verwendet werden.
4. `supabase-config.js` öffnen und beide Platzhalter ersetzen:

```js
window.SUPABASE_CONFIG = Object.freeze({
  url: "https://DEIN-PROJEKT.supabase.co",
  publishableKey: "sb_publishable_DEIN_OEFFENTLICHER_SCHLUESSEL"
});
```

Der Publishable-/Anon-Key darf in einer öffentlichen Website stehen, weil RLS seine Rechte begrenzt. **Niemals** einen Secret- oder Service-Role-Key dort eintragen.

## D. Veröffentlichung prüfen

1. Zunächst die vorhandenen Dateien `fahrt-zum-kunden.html` und `geschichte.pdf` über `admin.html` als Version 1.10 hochladen.
2. Dafür `admin.html` öffnen und sich mit dem Administratorkonto anmelden.
3. Version, sichtbares Datum und Seitenzahl eintragen; HTML und PDF auswählen.
4. **Version jetzt veröffentlichen** drücken und die Erfolgsmeldung abwarten.
5. Landingpage neu öffnen. Versionsangaben sowie Lese- und PDF-Link kommen nun aus Supabase.
6. Zusätzlich eine Testrückmeldung absenden und in **Table Editor → reader_feedback** kontrollieren.

## E. Rechtliches vervollständigen

1. In `impressum.html` alle orange markierten Platzhalter ersetzen.
2. In `datenschutz.html` Verantwortlichen, Hosting-Anbieter, Supabase-Region und Löschfrist ergänzen.
3. Mit Supabase Vertrags- und Übermittlungsgrundlagen prüfen und, soweit erforderlich, einen Auftragsverarbeitungsvertrag abschließen.
4. Eine Löschroutine festlegen, beispielsweise monatliche Prüfung und Löschung nach zwölf Monaten.
5. Vor dem Livegang die Texte fachanwaltlich oder durch einen Datenschutzbeauftragten prüfen lassen.
6. Für DomainFactory den Vertrag zur Auftragsverarbeitung prüfen bzw. abschließen und die tatsächliche Log-Speicherdauer des gebuchten Tarifs in `datenschutz.html` ergänzen.

## F. Cookies

Die öffentliche Website setzt keine Cookies und nutzt kein Tracking. Der geschützte Adminbereich hält die Anmeldung nur bis zum Schließen des Browser-Tabs im Session Storage. Deshalb ist kein Cookie-Banner eingebaut. Sobald Analysewerkzeuge, YouTube, Karten, externe Schriftarten oder vergleichbare Dienste hinzukommen, muss neu geprüft werden, ob eine Einwilligung erforderlich ist.

## G. Ihr Ablauf bei jeder neuen Fortsetzung

1. Neue PDF und neue HTML-Lesefassung fertigstellen.
2. `admin.html` aufrufen und anmelden.
3. Versionsnummer, Datum und Seitenzahl eintragen.
4. Beide Dateien auswählen und veröffentlichen.
5. Landingpage in einem privaten Browserfenster prüfen.
6. Alte Fassungen müssen nicht manuell gelöscht werden: Die stabilen Dateien werden ersetzt.

## H. Spam-Schutz

Das unsichtbare Formularfeld hält einfache Bots ab. Für größere Reichweite sollte der direkte Datenbankzugriff durch eine Supabase Edge Function mit Rate-Limit und beispielsweise Cloudflare Turnstile ersetzt werden.
