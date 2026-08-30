# Veröffentlichung bei DomainFactory

## Rollen der Systeme

- **DomainFactory:** öffentliches Hosting der Landingpage
- **GitHub:** Quellcode, Versionsverwaltung und automatische Prüfungen
- **Supabase:** Leserfeedback, aktuelle Versionsangaben, HTML-Lesefassung und PDF

## Derzeitiger Ablauf

Nach einer Änderung am Aufbau der Landingpage werden die statischen Projektdateien auf den DomainFactory-Webspace übertragen. Neue Fortsetzungen der Geschichte werden anschließend ohne erneuten DomainFactory-Upload über `admin.html` in Supabase veröffentlicht.

## Für einen späteren automatischen Upload

Für eine sichere GitHub-Actions-Bereitstellung werden noch benötigt:

1. verwendetes Übertragungsverfahren: bevorzugt SFTP, andernfalls FTPS;
2. Servername;
3. Benutzername;
4. Zielverzeichnis der Domain;
5. Information, ob das Zielverzeichnis ausschließlich diese Website enthält;
6. gewünschter Auslöser: automatisch nach erfolgreicher CI oder nur manuell.

Passwort bzw. privater Schlüssel dürfen niemals in eine Projektdatei eingetragen werden. Sie werden als verschlüsselte GitHub-Secrets hinterlegt. Vor einem automatischen Löschen veralteter Serverdateien muss das exakte Zielverzeichnis geprüft werden.
