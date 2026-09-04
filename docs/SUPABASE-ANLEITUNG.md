# Supabase Schritt für Schritt einrichten

Die Landingpage selbst wird bei DomainFactory gehostet. Supabase stellt die jeweils aktuelle HTML-/PDF-Fassung bereit und speichert Leserfeedback. GitHub verwaltet den Quellcode und führt die automatischen Prüfungen aus.

## A. Projekt vorbereiten

1. Bei Supabase anmelden und das gewünschte Projekt öffnen.
2. Oben prüfen, in welcher Region das Projekt liegt. Die Region für die Datenschutzerklärung notieren.
3. Links **SQL Editor** öffnen und **New query** wählen.
4. Den vollständigen Inhalt aus `supabase/setup.sql` einfügen.
5. **Run** drücken. Es sollte kein Fehler erscheinen.

Damit werden Feedbacktabelle, kurzlebige Rate-Limit-Daten und die serverseitige
Schreibfunktion erstellt. Browser erhalten keinen direkten Zugriff auf diese
Tabellen.

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
4. `assets/js/supabase-config.js` öffnen und beide Platzhalter ersetzen:

```js
window.SUPABASE_CONFIG = Object.freeze({
  url: "https://DEIN-PROJEKT.supabase.co",
  publishableKey: "sb_publishable_DEIN_OEFFENTLICHER_SCHLUESSEL"
});
```

Der Publishable-/Anon-Key darf in einer öffentlichen Website stehen, weil RLS seine Rechte begrenzt. **Niemals** einen Secret- oder Service-Role-Key dort eintragen.

## D. Veröffentlichung prüfen

1. `admin.html` öffnen und sich mit dem Administratorkonto anmelden.
2. Beim ersten Mal den angezeigten QR-Code mit einer Authenticator-App scannen.
3. Den sechsstelligen Code bestätigen. Das Veröffentlichungsformular erscheint
   erst nach erfolgreicher MFA-Prüfung.
4. Version, sichtbares Datum und Seitenzahl eintragen; HTML und PDF auswählen.
5. **Version jetzt veröffentlichen** drücken und die Erfolgsmeldung abwarten.
6. Landingpage neu öffnen. Versionsangaben sowie Lese- und PDF-Link kommen nun aus Supabase.

Wichtig: MFA unmittelbar nach dem Einspielen der SQL-Änderung selbst
einrichten. Das Administratorkonto darf nicht unbeaufsichtigt nur mit Passwort
bleiben. Den Wiederherstellungszugang zur Authenticator-App sicher verwahren.

## E. Rechtliches vervollständigen

1. In `impressum.html` alle orange markierten Platzhalter ersetzen.
2. In `datenschutz.html` Verantwortlichen, Hosting-Anbieter, Supabase-Region und Löschfrist ergänzen.
3. Mit Supabase Vertrags- und Übermittlungsgrundlagen prüfen und, soweit erforderlich, einen Auftragsverarbeitungsvertrag abschließen.
4. Eine Löschroutine festlegen, beispielsweise monatliche Prüfung und Löschung nach zwölf Monaten.
5. Vor dem Livegang die Texte fachanwaltlich oder durch einen Datenschutzbeauftragten prüfen lassen.
6. Für DomainFactory den Vertrag zur Auftragsverarbeitung prüfen bzw. abschließen. Apache- und Error-Logs werden im cPanel-Webhosting grundsätzlich nach 14 Tagen gelöscht. Für die standardmäßig aktiven Werkzeuge AWStats und Webalizer ebenfalls eine automatische Löschung der Rohdaten und Statistiken nach 14 Tagen einrichten.

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

Das unsichtbare Formularfeld wird durch die Edge Function und ein serverseitig
atomar geprüftes Limit ergänzt: mindestens 15 Sekunden Abstand und höchstens
drei Rückmeldungen innerhalb von 15 Minuten. Es werden keine rohen IP-Adressen
in der Datenbank gespeichert; eine stündliche Löschroutine entfernt
pseudonyme Prüfwerte nach Ablauf von 24 Stunden.

### Edge Function einmalig aktivieren

1. Einen zufälligen geheimen Wert mit mindestens 32 Zeichen erzeugen. Er darf
   niemals in eine Projektdatei oder nach GitHub kopiert werden.
2. Im Supabase Dashboard unter **Edge Functions → Secrets** ein Secret namens
   `FEEDBACK_HASH_SALT` mit diesem Wert anlegen.
3. Die Funktion `supabase/functions/submit-feedback/index.ts` als
   `submit-feedback` bereitstellen. Mit der Supabase CLI:

   ```powershell
   supabase functions deploy submit-feedback --no-verify-jwt
   ```

4. `supabase/config.toml` legt ebenfalls fest, dass Besucher die Funktion ohne
   Anmeldung aufrufen dürfen. Die Funktion akzeptiert trotzdem nur POST vom
   Ursprung `https://berndmarnau.de` beziehungsweise `https://www.berndmarnau.de`.
5. Das Formular einmal erfolgreich absenden. Ein unmittelbar zweiter Versuch
   muss mit dem Wartehinweis abgewiesen werden.

### Sicherheitsprüfung

Nach `setup.sql` den Inhalt von `supabase/tests/security-checks.sql` im SQL
Editor ausführen. Erwartet wird **Success. No rows returned**. Der Test läuft in
einer Transaktion und hinterlässt keine Testdaten.

Die IP-basierte Begrenzung erschwert automatisierten Missbrauch deutlich, ist
aber kein vollständiger DDoS-Schutz: Angreifer können wechselnde Netze oder
Proxys verwenden. Bei erheblichem Missbrauch wäre als nächste Stufe ein CAPTCHA
oder ein vorgeschalteter spezialisierter Rate-Limit-Dienst sinnvoll.
