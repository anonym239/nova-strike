# Nova Strike

Ein Space-Shooter im Browser, den du berührungslos mit deiner Hand über die Webcam steuerst.
Das Hand-Tracking läuft mit MediaPipe komplett im Browser – es wird kein Kamerabild hochgeladen.

## Steuerung

| Geste | Aktion |
| --- | --- |
| Hand bewegen | Schiff steuern |
| Daumen + Zeigefinger zusammenkneifen | Feuern (halten = Dauerfeuer), Starten / Neustarten |
| Offene Hand, alle Finger gestreckt | Schild (verbraucht Energie) |
| Hand aus dem Bild | Pause |

Ohne Webcam geht es auch mit der Maus: Bewegen = Steuern, Linksklick = Feuer,
Rechtsklick / Leertaste = Schild, P = Pause.

## Einstellungen

Im Startmenü (und über „⚙ Einstellungen“ vor jeder Runde):

- **Hand** – Automatisch, rechte oder linke Hand. Das Spiel bleibt bei der einmal erkannten Hand
  und springt nicht zur anderen.
- **Steuerzone** – der Bereich im Kamerabild, in dem du die Hand bewegst (Mitte, Unten, Links, Rechts,
  Ecken oder „Eigene Position“ = dort, wo du beim Start kneifst). So ist die Hand nicht vor dem Bildschirm.
- **Bewegung** – wie groß die Handbewegung für den ganzen Bildschirm sein muss.
- **Grafik** – „Flüssig“ (Standard, sparsam für Laptops) oder „Schön“ (volle Auflösung, Leuchteffekte).

Die Steuerzone ist im kleinen Kamerabild unten rechts gestrichelt eingezeichnet.

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
