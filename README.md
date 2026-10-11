# Hand Arcade

Eine Sammlung von Browser-Spielen, die du berührungslos mit deiner Hand über die Webcam steuerst.
Das Hand-Tracking läuft mit MediaPipe komplett im Browser – es wird kein Kamerabild hochgeladen.

## Spiele

| Spiel | Steuerung |
| --- | --- |
| **Nova Strike** – Space-Shooter | Hand = Schiff · Kneifen = Feuer · offene Hand = Schild |
| **Neon Slice** – Kristalle zerschneiden | schnelle Handbewegung = Schnitt |
| **Brick Breaker** – Steine abräumen | Hand = Schläger · Kneifen = Ball starten |
| **Sky Hopper** – durch Tore flattern | Kneifen = Flügelschlag |

Jedes Spiel geht auch mit der Maus. Hand (rechts/links), Steuerzone, Bewegungsgröße und Grafik stellst du
im Startmenü eines Spiels ein; die Einstellungen gelten für alle Spiele.

## Aufbau

```
index.html          Menü mit allen Spielen
games.js            Liste der Spiele im Menü
lib/handtrack.js    Kamera, Hand-Erkennung, Gesten (für alle Spiele)
lib/shell.js        Spiel-Rahmen: Startmenü, Einstellungen, Pause, Punkte, Game Over
games/<name>/       je ein Spiel
games/vorlage/      Vorlage für neue Spiele (nicht im Menü)
```

## Ein neues Spiel hinzufügen

1. Den Ordner `games/vorlage` kopieren, z. B. nach `games/mein-spiel`.
2. In `games/mein-spiel/index.html` die Funktionen `start()`, `update()` und `draw()` füllen.
   Oben in der Datei steht, was das Spiel von der Hand lesen kann (Position, Geschwindigkeit,
   Kneifen, offene Hand, Faust).
3. In `games.js` einen Eintrag ergänzen – das Spiel erscheint dann automatisch im Menü.

## Hand-Tracking

- Die Erkennung läuft in einem Web Worker und wertet jedes neue Kamerabild sofort aus; nur wenn das
  Spiel ruckelt, wird seltener erkannt.
- Die Position wird geglättet (One-Euro-Filter) und mit der Handgeschwindigkeit auf den aktuellen
  Moment vorausberechnet. So gleicht das Spiel die Verzögerung von Kamera und Erkennung aus und die
  Figur bewegt sich auch zwischen zwei Kamerabildern weiter.
- Es wird immer nur eine Hand verfolgt; eine Faust zählt nicht als Kneifen.

## Lokal starten

Die Kamera braucht `https` oder `localhost`, deshalb über einen kleinen Server öffnen:

```bash
python -m http.server 8765
```

Dann <http://localhost:8765> in Chrome oder Edge aufrufen.

## Auf Netlify veröffentlichen

Das Repo ist fertig konfiguriert (`netlify.toml`, kein Build-Schritt):

1. Auf <https://app.netlify.com> „Add new site → Import an existing project“ wählen.
2. Dieses GitHub-Repo auswählen und „Deploy“ klicken – Build-Befehl leer lassen.

Jeder weitere Push auf `main` wird danach automatisch veröffentlicht.
