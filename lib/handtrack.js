// Gemeinsames Hand-Tracking für alle Spiele der Hand Arcade.
// Kamera → MediaPipe (in einem Worker) → eine ausgewählte Hand → geglättete, vorausberechnete Position + Gesten.

const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---------- Einstellungen (gelten für alle Spiele) ---------- */
export const settings = { hand: 'auto', zone: 'mitte', size: 'gross', gfx: 'schnell' };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem('handArcadeSettings') || localStorage.getItem('novaStrikeSettings') || '{}'));
} catch {}
export function saveSettings() { try { localStorage.setItem('handArcadeSettings', JSON.stringify(settings)); } catch {} }

// Steuerzone im gespiegelten Kamerabild (0..1): Mittelpunkt je Voreinstellung, Kantenlänge je Bewegungsgröße
const ZONES = { mitte: [.5, .5], unten: [.5, .75], links: [.25, .5], rechts: [.75, .5], linksunten: [.25, .75], rechtsunten: [.75, .75] };
const SIZES = { gross: .66, normal: .46, klein: .3 };
let customC = [.5, .5];
export function setCustomCenter(x, y) { customC = [x, y]; }
export function zoneRect() {
  const s = SIZES[settings.size] || SIZES.gross, c = settings.zone === 'eigen' ? customC : ZONES[settings.zone] || ZONES.mitte;
  const fit = v => clamp(v, s / 2 + .02, 1 - s / 2 - .02);
  return { x: fit(c[0]) - s / 2, y: fit(c[1]) - s / 2, s };
}

/* ---------- Zustand der Hand, den die Spiele lesen ---------- */
const preview = document.createElement('canvas'); preview.width = 200; preview.height = 150;
const pctx = preview.getContext('2d');
export const hand = {
  ready: false,    // Kamera und Erkennung laufen
  present: false,  // Hand ist im Bild
  x: .5, y: .5,    // Position in der Steuerzone (0..1), geglättet und auf "jetzt" vorausberechnet
  raw: null,       // Handmitte im gespiegelten Kamerabild (0..1)
  pinch: false,    // Daumen + Zeigefinger zusammen
  open: false,     // alle Finger gestreckt
  fist: false,     // alle Finger eingerollt
  lm: null,        // die 21 Handpunkte
  interval: 0,     // ms Pause zwischen zwei Erkennungen (passt sich der Bildrate an)
  preview,         // kleines, gespiegeltes Kamerabild mit Handpunkten
};

/* Glättet Zittern bei ruhiger Hand und bleibt bei schnellen Bewegungen direkt; liefert auch die Geschwindigkeit. */
class OneEuro {
  constructor(minCutoff = 1.5, beta = 20, dCutoff = 1) { Object.assign(this, { minCutoff, beta, dCutoff, x: null, dx: 0, t: 0 }); }
  reset() { this.x = null; this.dx = 0; }
  next(x, t) {
    if (this.x === null) { this.x = x; this.dx = 0; this.t = t; return x; }
    const dt = Math.max(t - this.t, 1e-3), alpha = c => 1 / (1 + 1 / (2 * Math.PI * c) / dt);
    this.dx += alpha(this.dCutoff) * ((x - this.x) / dt - this.dx);
    this.x += alpha(this.minCutoff + this.beta * Math.abs(this.dx)) * (x - this.x);
    this.t = t;
    return this.x;
  }
}

const fx = new OneEuro(), fy = new OneEuro();
let base = null;            // letzte gemessene Position: { x, y, vx, vy, t }
let lock = null, lockSeen = 0, pinching = false, openSince = 0;
export function resetLock() { lock = null; }

// Bleibt bei der einmal gewählten Hand, statt zur anderen zu springen
function pickHand(res, now) {
  const hands = (res.landmarks || []).map((lm, i) => ({ lm, size: d2(lm[0], lm[9]),
    label: res.handedness?.[i]?.[0]?.categoryName,
    c: { x: 1 - (lm[0].x + lm[5].x + lm[17].x) / 3, y: (lm[0].y + lm[5].y + lm[17].y) / 3 } }));
  let h = null;
  if (lock) {
    h = hands.filter(o => d2(o.c, lock) < Math.max(.25, o.size * 1.5)).sort((a, b) => d2(a.c, lock) - d2(b.c, lock))[0];
    if (!h) { if (now - lockSeen < 700) return null; lock = null; }
  }
  if (!h) {
    const want = settings.hand === 'rechts' ? 'Right' : settings.hand === 'links' ? 'Left' : null;
    h = hands.filter(o => !want || o.label === want).sort((a, b) => b.size - a.size)[0];
  }
  if (!h) return null;
  lock = h.c; lockSeen = now;
  return h;
}

function updatePreview(lm) {
  pctx.save(); pctx.translate(preview.width, 0); pctx.scale(-1, 1);
  pctx.drawImage(video, 0, 0, preview.width, preview.height);
  if (lm) {
    pctx.fillStyle = hand.pinch ? '#ffd27a' : hand.open ? '#35e0ff' : '#7dff9b';
    for (const q of lm) pctx.fillRect(q.x * preview.width - 2, q.y * preview.height - 2, 4, 4);
  }
  pctx.restore();
}

// tCapture = Zeitpunkt, zu dem das ausgewertete Kamerabild aufgenommen wurde
function applyHands(res, tCapture) {
  const now = performance.now();
  let h = null;
  try { h = pickHand(res, now); } catch {}
  const lm = h && h.lm;
  hand.lm = lm || null;
  if (!lm) {
    hand.present = hand.pinch = hand.open = hand.fist = false;
    pinching = false; openSince = 0; base = null; fx.reset(); fy.reset();
    updatePreview(null);
    return;
  }
  hand.present = true; hand.raw = h.c;
  const z = zoneRect(), t = tCapture / 1000;
  const x = fx.next(clamp((h.c.x - z.x) / z.s, 0, 1), t), y = fy.next(clamp((h.c.y - z.y) / z.s, 0, 1), t);
  base = { x, y, vx: fx.dx, vy: fy.dx, t: tCapture };

  const size = Math.max(d2(lm[0], lm[9]), d2(lm[5], lm[17]) * 1.25) || 1e-6;
  // Streckung je Finger: ~2 = gestreckt, unter 1 = in die Handfläche eingerollt
  const curl = tip => d2(lm[tip], lm[0]) / (d2(lm[tip - 3], lm[0]) || 1e-6);
  const curls = [8, 12, 16, 20].map(curl);
  hand.fist = Math.max(...curls) < 1.1;
  const pinch = d2(lm[4], lm[8]) / size;
  if (pinching ? pinch > 0.5 : pinch < 0.32 && curls[0] >= .95) pinching = !pinching; // eine Faust ist kein Kneifen
  const open = !pinching && pinch > 0.7 && Math.min(...curls) > 1.5;
  if (!open) openSince = 0; else if (!openSince) openSince = now;
  hand.pinch = pinching;
  hand.open = open && now - openSince > 100;
  updatePreview(lm);
}

/* ---------- Kamera + Erkennung ---------- */
const video = document.createElement('video');
video.playsInline = true; video.muted = true;
video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';

const WORKER_SRC = `
let lm = null;
self.onmessage = async e => {
  const m = e.data;
  if (m.init) {
    try {
      const v = await import(m.cdn + '/vision_bundle.mjs');
      const fs = await v.FilesetResolver.forVisionTasks(m.cdn + '/wasm');
      const make = delegate => v.HandLandmarker.createFromOptions(fs, {
        baseOptions: { modelAssetPath: m.model, delegate }, runningMode: 'VIDEO', numHands: 2 });
      try { lm = await make('GPU'); } catch { lm = await make('CPU'); }
      postMessage({ ready: true });
    } catch (err) { postMessage({ error: String(err) }); }
  } else if (m.frame) {
    let r = null;
    try { r = lm.detectForVideo(m.frame, m.t); } catch {}
    m.frame.close();
    postMessage({ t: m.t, landmarks: r ? r.landmarks : [], handedness: r ? r.handedness : [] });
  }
};`;

let worker = null, landmarker = null, busy = false, lastVT = -1, lastDetect = 0, starting = null;

function startWorker() {
  return new Promise((resolve, reject) => {
    if (!window.Worker || !window.createImageBitmap) return reject(new Error('kein Worker'));
    const w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
    const timer = setTimeout(() => { w.terminate(); reject(new Error('Zeitüberschreitung')); }, 30000);
    w.onerror = e => { clearTimeout(timer); w.terminate(); reject(new Error(e.message || 'Worker-Fehler')); };
    w.onmessage = e => {
      if (e.data.ready) { clearTimeout(timer); worker = w; w.onerror = null; resolve(); }
      else if (e.data.error) { clearTimeout(timer); w.terminate(); reject(new Error(e.data.error)); }
      else { busy = false; applyHands(e.data, e.data.t); }
    };
    w.postMessage({ init: true, cdn: CDN, model: MODEL });
  });
}

/** Startet Kamera und Hand-Erkennung. onStatus bekommt kurze Statusmeldungen; Fehler werden geworfen. */
export function startCamera(onStatus = () => {}) {
  if (hand.ready) return Promise.resolve();
  return starting ||= (async () => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Dieser Browser unterstützt keine Webcam.');
    onStatus('Kamera wird gestartet … bitte Zugriff erlauben.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false,
      video: { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' } });
    document.body.appendChild(video);
    video.srcObject = stream; await video.play();
    onStatus('Hand-Tracking wird geladen …');
    try { await startWorker(); }
    catch (e) {
      console.warn('Hand-Tracking im Worker nicht möglich, nutze den Hauptthread:', e.message);
      const { HandLandmarker, FilesetResolver } = await import(CDN + '/vision_bundle.mjs');
      const fileset = await FilesetResolver.forVisionTasks(CDN + '/wasm');
      const make = delegate => HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numHands: 2 });
      try { landmarker = await make('GPU'); } catch { landmarker = await make('CPU'); }
    }
    hand.ready = true;
  })().catch(e => { starting = null; throw e; });
}

/** Fehlertext für den Nutzer zu einem Fehler aus startCamera. */
export function cameraErrorText(e) {
  return e.name === 'NotAllowedError' ? 'Kamerazugriff wurde abgelehnt. Erlaube die Kamera oder spiele mit der Maus.'
    : e.name === 'NotFoundError' ? 'Keine Webcam gefunden. Du kannst mit der Maus spielen.'
    : 'Start fehlgeschlagen: ' + (e.message || e) + ' – Internetverbindung prüfen oder mit der Maus spielen.';
}

let lastPoll = 0, ftAvg = 16, adaptT = 0;
const LEAD = .8, MAX_AHEAD = 100; // Anteil der Verzögerung, der vorausgerechnet wird, und Obergrenze in ms

/** In jedem Frame aufrufen (mit dem Zeitstempel von requestAnimationFrame). */
export function pollHand(now) {
  if (!hand.ready) return;
  // Jedes neue Kamerabild sofort auswerten; nur wenn das Spiel ruckelt, seltener
  const ms = now - lastPoll; lastPoll = now;
  ftAvg += (Math.min(ms, 100) - ftAvg) * .05; adaptT += ms;
  if (adaptT > 1000) {
    adaptT = 0;
    hand.interval = clamp(hand.interval + (ftAvg > 20 ? 8 : ftAvg < 17.5 ? -8 : 0), settings.gfx === 'spar' ? 60 : 0, 110);
  }
  if (busy && now - lastDetect > 2000) busy = false;
  if (!busy && video.readyState >= 2 && now - lastDetect >= hand.interval && video.currentTime !== lastVT) {
    lastVT = video.currentTime; lastDetect = now;
    if (worker) {
      busy = true;
      createImageBitmap(video).then(bmp => worker.postMessage({ frame: bmp, t: now }, [bmp])).catch(() => { busy = false; });
    } else {
      let res = null;
      try { res = landmarker.detectForVideo(video, now); } catch {}
      applyHands(res || {}, now);
    }
  }
  // Das Messergebnis ist ein paar Millisekunden alt: mit der Handgeschwindigkeit auf "jetzt" vorausrechnen.
  // So folgt die Spielfigur ohne spürbare Verzögerung und bewegt sich auch zwischen zwei Kamerabildern weiter.
  if (hand.present && base) {
    const ahead = clamp(now - base.t, 0, MAX_AHEAD) / 1000 * LEAD;
    hand.x = clamp(base.x + base.vx * ahead, 0, 1);
    hand.y = clamp(base.y + base.vy * ahead, 0, 1);
  }
}
