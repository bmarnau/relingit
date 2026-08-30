# Wiederverwendbarer Codex-Prompt

```text
Du arbeitest im Repository https://github.com/bmarnau/relingit an der statischen Landingpage für die fortlaufende Geschichte „Die Fahrt zum Kunden“.

Ziel:
- Veröffentliche die jeweils neueste Fassung als zugängliche, schnelle Landingpage mit HTML, CSS und Vanilla JavaScript.
- Ersetze bei neuen lokalen Rückfallfassungen nur `story/current/geschichte.pdf` und `story/current/fahrt-zum-kunden.html`.
- Aktualisiere bei Bedarf die Rückfallversion in `assets/js/app.js`.
- Bewahre vorhandene Rückmeldungen, URLs und die visuelle Identität.

Vor jeder Änderung:
1. Lies die neue PDF vollständig und vergleiche sie mit der bisherigen Fassung.
2. Prüfe Handlung, Zeitlinie, Figuren, Erzähltempo, Unterhaltungswert und Widersprüche.
3. Prüfe fachliche Aussagen zu IT-Betrieb, KI-Agenten, Datenschutz, Informationssicherheit, Backups, APIs, MCP, CI und menschlicher Freigabe.
4. Trenne klar zwischen echten Fehlern, plausiblen Annahmen und redaktionellen Empfehlungen.
5. Aktualisiere `docs/REVIEW.md` mit priorisierten Hinweisen für die nächste Fortsetzung; ändere den Text der Geschichte nicht ungefragt.

Umsetzung:
- Keine Frameworks und kein Build-Schritt.
- Semantisches HTML, gute Tastaturbedienung, sichtbare Fokuszustände, ausreichende Kontraste und responsive Darstellung ab 320 px.
- Der primäre Button öffnet die HTML-Lesefassung; `pdf.html` bietet PDF-Ansicht, Download und Rückweg zur Landingpage.
- Das Feedbackformular speichert anonym in Supabase. Verwende ausschließlich den öffentlichen Publishable Key, halte RLS aktiv und erlaube `anon` nur INSERT – niemals SELECT, UPDATE oder DELETE. Zeige Erfolg und Fehler verständlich an.
- Keine echten Kundendaten, Tracking-Skripte oder unnötigen externen Abhängigkeiten.

Prüfung vor Abschluss:
- Prüfe alle lokalen Links und Dateien.
- Teste Desktop und 390-px-Mobilansicht, Navigation, Download, Formularvalidierung und Browserkonsole.
- Prüfe Git-Diff und Whitespace.
- Berichte knapp: geänderte Version, inhaltliche Auffälligkeiten, Testergebnis und noch offene Entscheidungen.
```
