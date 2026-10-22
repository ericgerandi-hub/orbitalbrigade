# Orbitalbrigade – Arbeitsweise

Deutsches 3D-Browserspiel (three.js r128), Koop-Mehrspieler über PeerJS. Live: https://ericgerandi-hub.github.io/orbitalbrigade/

## Dateien
- `src/` ist die Quelle. Hier wird geändert, nie direkt in den Dateien im Hauptordner.
  - `orbitalbrigade.html` – Seite (auch die Einzelspieler-Version als Claude-Artifact)
  - `ob-data.js` Werte/Speicherstand, `ob-world.js` Szene/Modelle, `ob-audio.js` Ton/Musik, `ob-game.js` Spiellogik
  - `ob-net.js` PeerJS-Verbindung, `ob-mp.js` Mehrspieler-Sync (nur auf der Webseite geladen)
- `src/build-site.py` baut daraus `index.html` und die JS-Dateien im Hauptordner.

## Nach JEDER Änderung (vom Nutzer ausdrücklich gewünscht)
1. In `src/ob-mp.js` die `GAME_VER` hochzählen (z. B. `2026-10-22d` → `2026-10-22e`), damit beide Spieler dieselbe Version haben und der Browser-Cache umgangen wird.
2. `python3 src/build-site.py`
3. Commit und Push auf `main`. GitHub Pages veröffentlicht automatisch.
4. Nach 1–2 Minuten prüfen, dass die neue `GAME_VER` online ist (WebFetch auf `…/orbitalbrigade/ob-mp.js`), und dem Nutzer Bescheid geben: Seite mit Strg+F5 neu laden.

## Hinweise
- Alles, was der Nutzer sieht, auf Deutsch.
- Keine ZIP-Dateien schicken, außer der Nutzer fragt danach.
- Mehrspieler: Host simuliert Gegner/Einheiten und sendet Schnappschüsse, der Gast schießt lokal und meldet Schaden. Neue Einheiten oder Gebäude brauchen Einträge in `hostSnap`/`applySnap`.
