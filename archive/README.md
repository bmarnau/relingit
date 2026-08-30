# Lokales Dateiarchiv

Dieser Ordner ist für Dateien vorgesehen, die nicht mehr aktiv benötigt werden, aber vorerst erhalten bleiben sollen.

## Ablageregel

1. Für jede Aufräumaktion einen Unterordner im Format `JJJJ-MM-TT-kurzer-grund` anlegen, beispielsweise `2026-09-15-version-1-10`.
2. Nicht mehr benötigte Dateien dorthin verschieben, nicht kopieren.
3. Vor dem Verschieben prüfen, dass keine aktive HTML-, CSS-, JavaScript- oder Dokumentationsdatei mehr darauf verweist.
4. Das Archiv niemals per FTP auf den öffentlichen Webspace übertragen.
5. Archivierte Inhalte werden durch `.gitignore` bewusst nicht zu GitHub übertragen. Sie bleiben ausschließlich in dieser lokalen Arbeitskopie beziehungsweise deren persönlicher Datensicherung.

## Abgrenzung

- `archive/`: nicht mehr aktive Dateien
- `source/`: weiterhin relevante Original- und Quelldateien
- `story/current/`: aktuell verwendete lokale Rückfallfassung
- `docs/`: aktuelle Anleitungen und Prüfberichte

Das Archiv ist keine Datensicherung. Wichtige Originaldateien sollten zusätzlich in einer regulären, geschützten Sicherung aufbewahrt werden.
