# Redaktionelle Prüfung – Version 1.11

## Kurzurteil

Die Geschichte ist grundsätzlich stimmig, sympathisch und ungewöhnlich konkret. Besonders gut funktionieren die wiederkehrenden Leitplanken „Navis navigiert, Mira steuert“, „Entwurf vor Freigabe“ und der Kontrast zwischen menschlicher Verantwortung und technischer Unterstützung. Die fachlichen Kapitel sind überwiegend plausibel, sollten aber an einigen Stellen genauer formuliert werden.

Version 1.11 korrigiert die Beschreibung des Aufbaus auf dem Deckblatt: Teil 1 beginnt tatsächlich mit mehreren Alltagsszenen, bevor die Fahrt zum Kunden einsetzt. Die Erzählung, ihre Kapitelreihenfolge und die technischen Aussagen sind gegenüber Version 1.10 unverändert. Die Korrektur beseitigt die bisherige Unstimmigkeit, ohne neue inhaltliche Probleme einzuführen.

## Empfehlungen für die nächste Version

1. **Zeitlogik glätten:** Die Fahrt ist am Vorabend, der Kundentermin am nächsten Morgen. Später heißt es, Mira habe sich „heute Morgen“ vor der Fahrt einen Bericht ausgedruckt. Das wirkt wie ein Wechsel zwischen Abend- und Morgenfassung. Eine eindeutige Übernachtung oder ein klarer Szenenwechsel würde helfen.
2. **Navis/Lumen-Quellen konsistent halten:** In der Erzählung liest Navis aus Sysingboard *und* Report-Familie; im Realteil wird Navis dem Sysingboard und Lumen dem Hub zugeordnet. Entweder die Rollen strikt trennen oder ausdrücklich erklären, dass Navis Lumens Hub-Abfrage orchestriert.
3. **Ablenkung beim Fahren stärker begrenzen:** Sprachsteuerung reduziert, beseitigt aber Ablenkung nicht. Die Geschichte sollte ergänzen, dass nur kurze, nicht dringliche Abfragen während der Fahrt zulässig sind und komplexe Inhalte bis zum Halt warten.
4. **Telefonweg sicherheitstechnisch ergänzen:** Ein gewöhnlicher Anruf ist plausibel, aber Authentifizierung, Rufnummern-Spoofing, Verschlüsselung, Einwilligung zur Sprachverarbeitung und Aufbewahrungsfristen bleiben offen. „Nichts bleibt auf dem Telefon“ bedeutet außerdem nicht, dass Provider oder Zentrale keine Metadaten bzw. Transkripte verarbeiten.
5. **MCP präziser beschreiben:** MCP standardisiert die Verbindung zwischen KI-Anwendung und Werkzeugen, ersetzt aber nicht automatisch den Adapter- oder Integrationscode zum jeweiligen Fachsystem. Der Satz „ohne … Individualcode“ ist zu absolut.
6. **Backup-Priorität fachlich schärfen:** 41 Stunden seit der letzten erfolgreichen Sicherung sind relevant, aber die Priorität hängt von RPO/RTO, Datenänderungsrate, Redundanz und Wiederherstellungstest ab. Navis sollte diese Vertrags- und Risikodaten nennen oder offen sagen, dass sie fehlen.
7. **EU-Speicherung nicht mit Datenschutz gleichsetzen:** Eine EU-Region allein beantwortet weder Zugriffsrechte noch Unterauftragsverarbeiter, Drittlandtransfers, Verschlüsselung, Löschkonzept und AV-Vertrag. Das eignet sich gut als fachlicher Zusatz im Kundengespräch.
8. **CI-Aussage differenzieren:** „Jeder Commit stößt … an“ und bei Fehlern startet „kein einziger nachfolgender Schritt“ ist nur bei strikt sequenzieller Pipeline richtig. Als bewusst gewählte Projektregel kennzeichnen.
9. **Prompt-Injection als konkrete Kontrolle ausbauen:** Die offene Frage zu manipulierten Kundendaten ist wichtig. Für die Fortsetzung wären Quellenkennzeichnung, erlaubte Tool-Parameter, Rechteprüfung, Output-Validierung und Audit-Log konkrete Gegenmaßnahmen.
10. **Erzähltempo straffen:** Die Rahmenhandlung wird durch mehrere Rückblenden und lange Realteil-Blöcke stark gedehnt. Für mehr Spannung könnten Teil 1 und der technische Realteil noch klarer getrennt oder einzelne Rückblicke gekürzt werden.

## Stärken, die erhalten bleiben sollten

- glaubwürdiger Systemhaus-Alltag ohne Technik-Heldenpathos
- klare menschliche Freigabe vor schreibenden Aktionen
- bewusster Verzicht auf eine irreführende Gesamtampel
- offene Architekturfragen statt vorgetäuschter Fertiglösung
- wiederkehrende Motive und Figuren als Basis für Fortsetzungen
