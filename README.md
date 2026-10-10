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
