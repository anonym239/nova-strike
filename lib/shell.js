// Spiel-Rahmen der Hand Arcade: Startmenü, Einstellungen, Kamera/Maus-Eingabe, Pause, Punkte, Game Over.
// Ein Spiel liefert nur noch start(), update() und draw() – siehe games/vorlage/index.html.
import { settings, saveSettings, hand, startCamera, cameraErrorText, pollHand, resetLock, zoneRect, setCustomCenter } from './handtrack.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

const CSS = `
  html,body{margin:0;height:100%;overflow:hidden;background:#05060f;color:#e8f4ff;font-family:"Segoe UI",system-ui,sans-serif;user-select:none}
  canvas{position:fixed;inset:0;width:100%;height:100%;display:block}
  body.playing canvas{cursor:none}
  #menu{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(ellipse at center,rgba(10,14,40,.55),rgba(3,4,12,.92))}
  #menu.hidden{display:none}
  .panel{width:min(620px,92vw);max-height:96vh;overflow:auto;text-align:center}
  .back{display:inline-block;margin-bottom:10px;color:#8fb6d9;font-size:13px;text-decoration:none;letter-spacing:.08em}
  .back:hover{color:#fff}
  h1{margin:0;font-size:clamp(34px,7vw,60px);letter-spacing:.1em;font-weight:800;color:transparent;
    background:linear-gradient(90deg,var(--c1),var(--c2));-webkit-background-clip:text;background-clip:text}
  .sub{margin:6px 0 18px;letter-spacing:.28em;font-size:12px;color:#8fb6d9;text-transform:uppercase}
  .controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:14px}
  .ccard{border:1px solid rgba(90,170,255,.28);border-radius:14px;padding:12px 10px;background:rgba(20,30,70,.35)}
  .ccard .ico{font-size:28px;line-height:1.2}
  .ccard b{display:block;margin-top:4px;font-size:14px}
  .ccard span{font-size:12px;color:#9db8d4}
  .settings{margin:0 0 20px;text-align:left;border:1px solid rgba(90,170,255,.2);border-radius:14px;padding:10px 14px;background:rgba(12,18,48,.45)}
  .row{display:flex;align-items:center;gap:10px;margin:6px 0}
  .row label{flex:0 0 92px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8fb6d9}
  .seg{display:flex;flex-wrap:wrap;gap:6px}
  button{font:inherit;font-weight:700;letter-spacing:.08em;border-radius:999px;cursor:pointer;padding:13px 28px;margin:5px;
    border:1px solid var(--c1);color:#04121c;background:var(--c1);transition:transform .12s}
  button:hover{transform:scale(1.05)}
  button.ghost{background:transparent;color:#bfe9ff;border-color:rgba(120,190,255,.5)}
  button:disabled{opacity:.45;cursor:default;transform:none}
  .seg button{margin:0;padding:6px 12px;font-size:12px;font-weight:600;letter-spacing:.02em;background:transparent;color:#bfe9ff;border-color:rgba(120,190,255,.35)}
  .seg button:hover{transform:none;border-color:var(--c1)}
  .seg button.on{background:var(--c1);color:#04121c;border-color:var(--c1)}
  #status{min-height:22px;margin-top:12px;font-size:14px;color:#ffd27a}
  .hint{margin-top:8px;font-size:12px;color:#6f8cab}
  #btnSettings{position:fixed;top:14px;right:14px;display:none;padding:8px 16px;font-size:12px;margin:0}
  body.idle #btnSettings{display:block}
`;

const seg = (key, opts) => `<div class="seg" data-key="${key}">${opts.map(([v, t]) => `<button data-v="${v}">${t}</button>`).join('')}</div>`;

export function createGame(game) {
  document.title = game.title + ' · Hand Arcade';
  const [c1, c2] = game.colors || ['#35e0ff', '#b06bff'];
  document.documentElement.style.setProperty('--c1', c1);
  document.documentElement.style.setProperty('--c2', c2);
  document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
  document.body.insertAdjacentHTML('beforeend', `
    <canvas id="game"></canvas>
    <button id="btnSettings" class="ghost">⚙ Einstellungen</button>
    <div id="menu"><div class="panel">
      <a class="back" href="../../">← ALLE SPIELE</a>
      <h1>${game.title.toUpperCase()}</h1>
      <div class="sub">${game.tagline || 'Berührungslos · gesteuert mit deiner Hand'}</div>
      <div class="controls">${game.controls.map(([ico, t, s]) => `<div class="ccard"><div class="ico">${ico}</div><b>${t}</b><span>${s}</span></div>`).join('')}</div>
      <div class="settings">
        <div class="row"><label>Hand</label>${seg('hand', [['auto', 'Automatisch'], ['rechts', 'Rechte Hand'], ['links', 'Linke Hand']])}</div>
        <div class="row"><label>Steuerzone</label>${seg('zone', [['mitte', 'Mitte'], ['unten', 'Unten'], ['links', 'Links'], ['rechts', 'Rechts'], ['linksunten', 'Links unten'], ['rechtsunten', 'Rechts unten'], ['eigen', 'Eigene Position']])}</div>
        <div class="row"><label>Bewegung</label>${seg('size', [['gross', 'Groß'], ['normal', 'Normal'], ['klein', 'Klein']])}</div>
        <div class="row"><label>Grafik</label>${seg('gfx', [['spar', 'Sparsam'], ['schnell', 'Flüssig'], ['schoen', 'Schön']])}</div>
      </div>
      <button id="btnCam">WEBCAM STARTEN</button><button id="btnMouse" class="ghost">MIT MAUS SPIELEN</button>
      <div id="status"></div>
      <div class="hint">${game.mouseHint || 'Maus-Modus: Bewegen = Steuern · Linksklick = Kneifen · Rechtsklick = offene Hand'} · P = Pause</div>
    </div></div>`);

  const cv = document.getElementById('game'), ctx = cv.getContext('2d', { alpha: false });
  const menu = document.getElementById('menu'), statusEl = document.getElementById('status');
  const btnCam = document.getElementById('btnCam'), btnMouse = document.getElementById('btnMouse');

  // Was das Spiel sieht und benutzen darf
  const input = { mode: null, present: false, x: 0, y: 0, vx: 0, vy: 0, pinch: false, pinchDown: false, open: false, fist: false };
  const api = { W: 0, H: 0, U: 1, t: 0, score: 0, best: 0, hi: false, input, rand, clamp, TAU,
    gameOver, sfx, text };
  try { api.best = +localStorage.getItem(game.bestKey) || 0; } catch {}

  let autoScale = 1;
  function resize() {
    const W = api.W = innerWidth, H = api.H = innerHeight;
    api.U = Math.min(W, H) / 720; api.hi = settings.gfx === 'schoen';
    const low = settings.gfx === 'spar';
    const d = (api.hi ? Math.min(devicePixelRatio || 1, 2) : Math.min(low ? .6 : 1, (low ? 900 : 1280) / W)) * autoScale;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  }
  resize();

  let ac = null;
  function sfx(f, d, type = 'square', v = .06, slide = 0) {
    if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d);
  }
  function initAudio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch {} }
  function text(s, x, y, size, col = '#fff', align = 'center', weight = 700) {
    ctx.font = `${weight} ${Math.round(size)}px "Segoe UI",system-ui,sans-serif`;
    ctx.textAlign = align; ctx.fillStyle = col; ctx.fillText(s, x, y);
  }

  /* ---------- Menü ---------- */
  let state = 'menu', userPause = false, hold = 0, overT = 0, armed = false, lostT = 0, newBest = false;
  for (const el of document.querySelectorAll('.seg')) {
    const key = el.dataset.key;
    const sync = () => { for (const b of el.children) b.classList.toggle('on', b.dataset.v === settings[key]); };
    el.onclick = e => { const v = e.target.dataset.v; if (!v) return; settings[key] = v; resetLock(); saveSettings(); sync();
      if (key === 'gfx') { autoScale = 1; resize(); } };
    sync();
  }
  function enterReady() { menu.classList.add('hidden'); document.body.classList.add('idle'); state = 'ready'; hold = 0; armed = true; }
  document.getElementById('btnSettings').onclick = () => {
    state = 'menu'; statusEl.textContent = ''; document.body.classList.remove('idle');
    btnCam.disabled = btnMouse.disabled = false;
    if (hand.ready) btnCam.textContent = 'WEITER MIT WEBCAM';
    menu.classList.remove('hidden');
  };
  btnCam.onclick = async () => {
    initAudio(); btnCam.disabled = btnMouse.disabled = true;
    try { await startCamera(msg => { statusEl.textContent = msg; }); input.mode = 'cam'; input.present = input.pinch = false; enterReady(); }
    catch (e) { console.error(e); statusEl.textContent = cameraErrorText(e); }
    btnCam.disabled = btnMouse.disabled = false;
  };
  btnMouse.onclick = () => { initAudio(); input.mode = 'mouse'; input.present = true; input.pinch = input.open = false; enterReady(); };

  addEventListener('pointermove', e => { if (input.mode === 'mouse') { input.x = e.clientX; input.y = e.clientY; } });
  addEventListener('pointerdown', e => {
    if (input.mode !== 'mouse' || e.target !== cv) return;
    input.x = e.clientX; input.y = e.clientY;
    if (e.button === 2) input.open = true; else input.pinch = true;
  });
  addEventListener('pointerup', e => { if (input.mode !== 'mouse') return; if (e.button === 2) input.open = false; else input.pinch = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('blur', () => { if (input.mode === 'mouse') input.pinch = input.open = false; });
  addEventListener('keydown', e => { if ((e.code === 'KeyP' || e.code === 'Escape') && state === 'play') userPause = !userPause; });

  function startGame() {
    if (input.mode === 'cam' && settings.zone === 'eigen' && hand.raw) setCustomCenter(hand.raw.x, hand.raw.y);
    document.body.classList.remove('idle'); document.body.classList.add('playing');
    api.score = 0; api.t = 0; newBest = false; state = 'play'; userPause = false;
    game.start(api);
  }
  function gameOver() {
    if (state !== 'play') return;
    state = 'over'; overT = 0; hold = 0; armed = false;
    document.body.classList.remove('playing'); document.body.classList.add('idle');
    if (api.score > api.best) { api.best = api.score; newBest = true; try { localStorage.setItem(game.bestKey, api.best); } catch {} }
    sfx(160, .6, 'sawtooth', .1, -120);
  }

  /* ---------- Eingabe pro Frame ---------- */
  let wasPinch = false, px = 0, py = 0;
  function readInput(now, dt) {
    if (input.mode === 'cam') {
      pollHand(now);
      input.present = hand.present; input.fist = hand.fist;
      if (hand.present) { input.x = hand.x * api.W; input.y = hand.y * api.H; input.pinch = hand.pinch; input.open = hand.open; }
      else input.pinch = input.open = false;
    }
    input.pinchDown = input.pinch && !wasPinch; wasPinch = input.pinch;
    input.vx = (input.x - px) / (dt || 1); input.vy = (input.y - py) / (dt || 1); px = input.x; py = input.y;
  }

  const stars = Array.from({ length: 110 }, () => { const z = rand(.2, 1); return { x: Math.random(), y: Math.random(), z, c: `rgba(190,220,255,${(.2 + z * .5).toFixed(2)})` }; });

  function drawPreview() {
    if (input.mode !== 'cam' || !hand.ready) return;
    const { W, H, U } = api, w = clamp(200 * U, 130, 240), h = w * .75, x = W - w - 16, y = H - h - 16, z = zoneRect();
    ctx.globalAlpha = .85; ctx.drawImage(hand.preview, x, y, w, h); ctx.globalAlpha = 1;
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x + z.x * w, y + z.y * h, z.s * w, z.s * h); ctx.setLineDash([]);
    ctx.strokeStyle = hand.present ? c1 : '#ff5a5a'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    text(!hand.present ? 'KEINE HAND' : hand.pinch ? 'KNEIFEN' : hand.open ? 'OFFEN' : hand.fist ? 'FAUST' : 'BEREIT', x + w / 2, y - 8, 12, hand.present ? '#bfe9ff' : '#ff7a7a');
  }
  function drawCursor() {
    if (!input.present) return;
    ctx.strokeStyle = c1; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(input.x, input.y, 14, 0, TAU); ctx.stroke();
    if (hold > 0) { ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(input.x, input.y, 24, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(hold / .7, 0, 1)); ctx.stroke(); }
  }

  /* ---------- Hauptschleife ---------- */
  let last = performance.now(), ftAvg = 16, adaptT = 0;
  function frame(now) {
    const ms = now - last, dt = Math.min(ms / 1000, .05); last = now;
    if (innerWidth !== api.W || innerHeight !== api.H) resize();
    ftAvg += (Math.min(ms, 100) - ftAvg) * .05; adaptT += ms;
    if (adaptT > 1000) {  // ruckelt es trotz gedrosselter Erkennung, die Auflösung senken
      adaptT = 0;
      if (settings.gfx === 'schnell' && ftAvg > 21 && hand.interval >= 80 && autoScale > .7) { autoScale = Math.max(.7, autoScale - .15); resize(); }
    }
    readInput(now, dt);
    const { W, H, U } = api;

    if (state === 'ready' || state === 'over') {
      overT += dt;
      if (!input.pinch) armed = true;
      const ok = armed && input.pinch && input.present && (state === 'ready' || overT > 1.2);
      hold = ok ? hold + dt : 0;
      if (hold > (input.mode === 'cam' ? .7 : .02)) { hold = 0; wasPinch = true; input.pinchDown = false; startGame(); }
    }
    lostT = input.present ? 0 : lostT + dt;
    const paused = userPause || (input.mode === 'cam' && lostT > .5);
    if (state === 'play' && !paused) { api.t += dt; game.update(dt, api); }

    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
    for (const s of stars) { s.y += dt * s.z * .05; if (s.y > 1) s.y = 0; ctx.fillStyle = s.c; ctx.fillRect(s.x * W, s.y * H, s.z * 2.2, s.z * 2.2); }
    if (state !== 'menu') {
      const startHint = input.mode === 'cam' ? 'Daumen + Zeigefinger zusammenkneifen und kurz halten' : 'Klicken zum Starten';
      if (state === 'ready') {
        text('BEREIT?', W / 2, H * .4, 64 * U, '#fff', 'center', 800);
        text(startHint, W / 2, H * .4 + 48 * U, Math.max(15, 20 * U), '#bfe9ff', 'center', 500);
        if (input.mode === 'cam' && !input.present) text('Halte deine Hand vor die Kamera', W / 2, H * .4 + 86 * U, Math.max(14, 17 * U), '#ffd27a', 'center', 500);
        drawCursor();
      } else {
        game.draw(ctx, api);
        const m = 22 * U, fs = Math.max(13, 15 * U);
        text('PUNKTE', m, m + fs, fs * .8, '#7fa6c9', 'left', 600);
        text(api.score.toLocaleString('de-DE'), m, m + fs * 2.7, fs * 1.9, '#fff', 'left', 800);
        text('REKORD ' + Math.max(api.best, api.score).toLocaleString('de-DE'), m, m + fs * 4, fs * .8, '#7fa6c9', 'left', 600);
        if (state === 'play' && paused) {
          ctx.fillStyle = 'rgba(3,4,12,.7)'; ctx.fillRect(0, 0, W, H);
          text('PAUSE', W / 2, H * .45, 60 * U, '#fff', 'center', 800);
          text(userPause ? 'P drücken zum Fortsetzen' : 'Hand nicht erkannt – halte sie wieder ins Bild', W / 2, H * .45 + 44 * U, Math.max(15, 20 * U), '#ffd27a', 'center', 500);
        } else if (state === 'over') {
          ctx.fillStyle = 'rgba(3,4,12,.72)'; ctx.fillRect(0, 0, W, H);
          text('GAME OVER', W / 2, H * .34, 68 * U, '#ff5a7a', 'center', 800);
          text(api.score.toLocaleString('de-DE') + ' Punkte', W / 2, H * .34 + 54 * U, 26 * U, '#fff');
          text(newBest ? '★ NEUER REKORD ★' : 'Rekord: ' + api.best.toLocaleString('de-DE'), W / 2, H * .34 + 92 * U, 18 * U, '#ffd27a', 'center', 600);
          if (overT > 1.2) text(startHint.replace('Starten', 'Neustarten'), W / 2, H * .34 + 150 * U, Math.max(15, 20 * U), '#bfe9ff', 'center', 500);
          drawCursor();
        }
      }
      drawPreview();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return api;
}
