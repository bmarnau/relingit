# Sicherheitskonzept

Stand: 4. September 2026

## Öffentliche Dateien und Schlüssel

Das Repository ist bewusst öffentlich. Der in
`assets/js/supabase-config.js` enthaltene Publishable Key identifiziert nur das
Supabase-Projekt und ist kein Geheimnis. Seine Rechte werden ausschließlich
durch Row Level Security (RLS) begrenzt.

Folgende Daten dürfen niemals in Git, Website-Dateien oder Screenshots gelangen:

- Supabase Secret- oder Service-Role-Key,
- `FEEDBACK_HASH_SALT`,
- GitHub-Zugriffstoken,
- Datenbankpasswort,
- TOTP-Einrichtungsschlüssel und Wiederherstellungsdaten,
- private Schlüssel und Zertifikatscontainer.

Die `.gitignore`-Regeln und CI suchen nach typischen Schlüsseldateien und
Schlüsselmustern. GitHub Push Protection bildet eine zusätzliche Schutzschicht.

## Veröffentlichungsrechte

Eine Veröffentlichung benötigt gleichzeitig:

1. gültige Supabase-Anmeldung mit E-Mail und Passwort,
2. bestätigten TOTP-Faktor (`aal2` im JWT),
3. Eintrag der Benutzer-UID in `public.admin_users`.

Das Formular bleibt bis zur erfolgreichen MFA-Prüfung verborgen. Entscheidend
ist nicht diese Anzeige, sondern die serverseitige RLS-Prüfung über
`public.is_story_admin()`. Sie schützt Metadaten und alle schreibenden
Storage-Operationen. Ein normaler angemeldeter Benutzer erhält keine Rechte.

Das Zugriffstoken liegt nur im Session Storage des aktuellen Browser-Tabs. Beim
Abmelden wird zusätzlich der Supabase-Logout aufgerufen. Das Passwort wird nach
der Anmeldung aus dem Formular entfernt.

## Öffentliches Feedback

Browser können nicht mehr direkt in `public.reader_feedback` schreiben. Die
Edge Function `submit-feedback` prüft:

- erlaubten Website-Ursprung,
- HTTP-Methode und maximale Anfragegröße,
- Honeypot,
- Kategorie, Textlänge und Versionsformat,
- mindestens 15 Sekunden Abstand,
- höchstens drei Einträge je 15 Minuten.

Die Edge Function bildet aus der Verbindungsadresse und einem ausschließlich
bei Supabase gespeicherten Salt einen SHA-256-Prüfwert. Rohe IP-Adressen werden
nicht in den Anwendungstabellen gespeichert. Prüfwerte, die älter als 24
Stunden sind, werden stündlich und zusätzlich bei neuen Einsendungen gelöscht.

Grenze: Ein Angreifer mit wechselnden IP-Adressen oder verteilten Systemen kann
die Begrenzung umgehen. Bei tatsächlich auftretendem erheblichem Missbrauch ist
ein CAPTCHA oder ein spezialisierter vorgeschalteter Rate-Limiter die nächste
Stufe.

## Eingebettete Dokumente

Story und Handout laufen in einem Sandbox-iframe ohne `allow-scripts` und mit
`referrerpolicy="no-referrer"`. Damit führen hochgeladene HTML-Dokumente kein
JavaScript aus und erhalten keinen unnötigen Referrer.

DomainFactory setzt über `.htaccess` unter anderem HTTPS, HSTS,
Content-Security-Policy, `nosniff`, Frame- und Berechtigungsbeschränkungen.

## GitHub und CI

- `main` wird durch Pull Requests und die erfolgreiche Prüfung
  **Website prüfen** geschützt.
- Force-Push und Löschen von `main` sind untersagt.
- Der Workflow besitzt nur Leserechte.
- Fremde Actions sind auf feste Commit-Prüfsummen fixiert.
- CI prüft Website, Versionen, PDFs, Links, JavaScript, Git-Whitespace,
  Geheimnismuster und die wesentlichen MFA-/RLS-/Rate-Limit-Invarianten.

Das persönliche GitHub-Konto muss zusätzlich mit Zwei-Faktor-Authentifizierung
oder Passkey geschützt sein. Diese persönliche Kontoeinstellung kann nicht im
Repository erzwungen oder dokumentiert werden; sie ist manuell zu kontrollieren.

## Einmalige Aktivierung nach dem Merge

1. `supabase/setup.sql` vollständig im SQL Editor ausführen.
2. `FEEDBACK_HASH_SALT` mit mindestens 32 zufälligen Zeichen als Supabase Edge
   Function Secret anlegen.
3. `submit-feedback` bereitstellen.
4. `supabase/tests/security-checks.sql` im SQL Editor ausführen.
5. Adminseite öffnen, anmelden und TOTP sofort einrichten.
6. Feedback einmal erfolgreich und unmittelbar danach erneut testen.
7. Geänderte Website-Dateien per geprüftem FTP-Paket zu DomainFactory kopieren.
8. Im FTP-Programm die Anzeige versteckter Dateien einschalten und prüfen, dass
   `.htaccess` im Ordner `/relingit` übertragen wurde.
9. Danach die Antwortheader der Live-Seite kontrollieren. Erwartet werden
   mindestens `Strict-Transport-Security`, `Content-Security-Policy`,
   `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` und
   `Permissions-Policy`.

Solange Schritte 1 bis 5 nicht erledigt sind, dürfen die neuen Website-Dateien
nicht produktiv hochgeladen werden: Die neue Feedbackroute wäre sonst noch
nicht erreichbar und die neuen AAL2-Regeln noch nicht aktiv.

Bei der Kontrolle am 4. September 2026 lieferte die Live-Domain diese Header
noch nicht aus. Falls `.htaccess` nachweislich übertragen wurde, muss
DomainFactory klären, ob `mod_headers` beziehungsweise eigene Headerregeln im
Tarif freigeschaltet sind.

## Reaktion auf einen vermuteten Schlüsselverlust

1. Betroffenen Schlüssel beim Anbieter sofort widerrufen beziehungsweise
   rotieren.
2. Erst danach den Schlüssel aus aktuellem Code und Git-Historie entfernen.
3. Supabase- und GitHub-Protokolle auf unberechtigte Vorgänge prüfen.
4. RLS, Admin-Allowlist und veröffentlichte Dateien kontrollieren.

Das Löschen eines Schlüssels aus der neuesten Datei reicht nicht: Öffentliche
Git-Historie und bereits erstellte Kopien bleiben sonst verwertbar.
