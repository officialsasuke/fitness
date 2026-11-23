# Fitness Planner

Web-App (PWA) für Hanteltraining zuhause und Kalorien-Tracking, im dunklen Gold-Look.

- **Training:** Plan A/B mit automatischer Steigerung (+1,5 kg), Satz-Abhaken, Pausen-Timer, „Leichter Tag“ nach harter Arbeit
- **Essen:** Kalorien- und Makro-Tracker mit Suche in Open Food Facts, Barcode-Scanner, Basis-Lebensmitteln und eigenen Produkten
- **Fortschritt:** Kraftkurven pro Übung, Pity-Leiste bis zur nächsten Steigerung, Körpergewicht mit Tempo-Auswertung
- **Offline:** funktioniert nach dem ersten Öffnen auch ohne Internet (außer Produktsuche)

## Online stellen (GitHub Pages)

1. Repo auf **Public** stellen (Settings → General → Danger Zone → Change visibility). Pages ist im kostenlosen Plan nur für öffentliche Repos verfügbar.
2. Settings → **Pages** → Source: *Deploy from a branch* → Branch `main`, Ordner `/ (root)` → Save.
3. Nach 1–2 Minuten läuft die App unter `https://officialsasuke.github.io/fitness/`.
4. Am Handy im Browser öffnen → Menü → **Zum Startbildschirm hinzufügen**.

## Daten

Alle Einträge liegen nur im Browser des jeweiligen Geräts (localStorage).
Übertragen oder sichern: *Fortschritt → Daten sichern oder übertragen* (Datei oder Text, Import auf dem anderen Gerät).

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `index.html` | Grundgerüst, Icon-Sammlung, Navigation |
| `css/style.css` | Gesamter Look |
| `js/core.js` | Speicher, Helfer, Meldungen |
| `js/training.js` | Trainingsplan, Logbuch, Fortschritt, Plan-Seite |
| `js/food.js` | Kalorien-Tracker, Open Food Facts, Scanner |
| `js/main.js` | Start, Navigation |
| `sw.js` | Offline-Cache – bei Änderungen `VERSION` erhöhen |

Nährwerte von [Open Food Facts](https://world.openfoodfacts.org) (Open Database License). Die Daten stammen aus der Community und können unvollständig sein.
Die Basis-Lebensmittel sind ungefähre Standardwerte.
