'use strict';
(() => {

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const GROUND = 470;          // altura do topo da calçada
const WORLD_W = 4600;
const GRAV = 0.55;
const MOVE = 4.4;
const SLOW = 0.45;
const GOAL_X = 4380;

// ---------- paleta 100% rosa ----------
const P = {
  sky1: '#ffc9e6', sky2: '#ffb1dc',
  sun: '#fff0f8',
  cloud: '#fff5fb',
  bldg: ['#f79ecc', '#f292c4', '#ef87bc', '#e977ad'],
  bldgWin: '#ffd9ec',
  ground: '#d94f9f', groundTop: '#ff9ed6', seam: '#b93c85',
  street: '#c23f8e', lane: '#ffd7ec',
  ramp: '#ff8fd0', rampEdge: '#c23f8e',
  plank: '#ff77c4',
  elev: '#ff77c4', elevDark: '#c23f8e', cable: '#a52f75',
  stair: '#e05fa8', stairEdge: '#ff9ed6',
  sign: '#fff0f8', signEdge: '#d94f9f', pole: '#c23f8e', signText: '#8f2462',
  star: '#fff8fd', starEdge: '#ff2f9e',
  car: '#ff4fae', carDark: '#c22a7f', glass: '#ffd9ec', tire: '#8f2462',
  chair: '#ff2f9e', chairDark: '#a91e6e', skin: '#ffd0e6', hair: '#a91e6e',
  flag: '#ff2f9e',
  hud: '#8f2462',
  pothole: '#a52f75',
  tactile: '#ffd0ea',
  goal: '#f26ab4',
};

const FACTS = [
  'No Brasil, mais de 18 milhões de pessoas têm alguma deficiência. Rotas acessíveis são direito, não favor.',
  'Rampas de meio-fio ajudam cadeirantes, idosos, carrinhos de bebê e quem carrega peso.',
  'A Lei Brasileira de Inclusão (Lei 13.146/2015) torna a acessibilidade obrigatória nas cidades.',
  'Um elevador público quebrado pode transformar 10 minutos de trajeto em horas de espera.',
  'Piso tátil e sinalização sonora dão independência a pessoas com deficiência visual.',
  'Carro na calçada empurra quem usa cadeira de rodas para o meio do trânsito.',
  'Manter calçadas lisas e bem sinalizadas mantém a cidade funcionando para todos.',
  'Buracos e degraus sem alternativa são barreiras arquitetônicas — e existem aos montes.',
  'Cidade acessível = liberdade de ir e vir. Compartilhe essa ideia!',
];

// ---------- nível ----------
function makeLevel() {
  return {
    solids: [
      { x: 0,    y: GROUND, w: 1560, h: 200, kind: 'ground' },
      { x: 1620, y: GROUND, w: 1200, h: 200, kind: 'ground' },
      { x: 3200, y: GROUND, w: 1400, h: 200, kind: 'ground' },
      { x: 2900, y: 570,    w: 220,  h: 100, kind: 'street' },   // pista do desvio
      { x: 700,  y: 390,    w: 120,  h: 80,  kind: 'stair' },    // escada bloqueando a calçada
      { x: 650,  y: 320,    w: 440,  h: 16,  kind: 'walkway' },  // passarela sobre a escada
      { x: 1550, y: GROUND, w: 80,   h: 10,  kind: 'plank' },    // tábua improvisada sobre o buraco
      { x: 1900, y: 390,    w: 700,  h: 80,  kind: 'plaza' },    // praça elevada
      { x: 2960, y: 400,    w: 120,  h: 70,  kind: 'parkedCar' },// carro estacionado na calçada
    ],
    ramps: [
      { x: 2600, y: 390,    w: 120, h: 80,  dir: -1 },  // descida da praça
      { x: 2820, y: GROUND, w: 80,  h: 100, dir: -1 },  // descida até a rua
      { x: 3120, y: GROUND, w: 80,  h: 100, dir: 1 },   // subida de volta à calçada
    ],
    elevators: [
      { x: 560,  y: GROUND, w: 90, h: 14, minY: 320, maxY: GROUND, speed: 0.9,  dir: -1, wait: 40, dy: 0, cableTop: 210 },
      { x: 1090, y: 320,    w: 90, h: 14, minY: 320, maxY: GROUND, speed: 0.9,  dir: 1,  wait: 40, dy: 0, cableTop: 210 },
      { x: 1810, y: GROUND, w: 90, h: 14, minY: 390, maxY: GROUND, speed: 0.8,  dir: -1, wait: 40, dy: 0, cableTop: 290 },
    ],
    patrols: [
      { x: 2900, y: 534, w: 92, h: 36, minX: 2900, maxX: 3028, speed: 1.3, dir: 1 },
      { x: 3120, y: 534, w: 92, h: 36, minX: 2980, maxX: 3128, speed: 1.9, dir: -1 },
    ],
    slowZones: [   // trechos de calçada esburacada
      { x: 1120, w: 90 },
      { x: 1260, w: 90 },
      { x: 1400, w: 70 },
    ],
    stars: [
      { x: 350,  y: 405 }, { x: 870,  y: 260 }, { x: 1330, y: 405 },
      { x: 1700, y: 420 }, { x: 2150, y: 325 }, { x: 2500, y: 325 },
      { x: 3010, y: 520 }, { x: 3550, y: 405 }, { x: 4150, y: 405 },
    ].map(s => ({ ...s, taken: false })),
    flags: [60, 940, 1650, 2800, 3320].map(x => ({ x, gy: GROUND, on: false })),
    signs: [
      { x: 150,  gy: GROUND, text: 'Oi! Sou a Rosa. Use ← e → para rodar. Eu não pulo: cadeirantes precisam de rampas e elevadores.' },
      { x: 460,  gy: GROUND, text: 'Escada bloqueando a calçada! Espere o elevador e embarque.' },
      { x: 1150, gy: GROUND, text: 'Calçada esburacada derruba a velocidade de qualquer rodinha.' },
      { x: 1460, gy: GROUND, text: 'Obra sem aviso! Uma tábua improvisada não é acessibilidade de verdade.' },
      { x: 1720, gy: GROUND, text: 'Elevador público = autonomia. Quando quebra, isola.' },
      { x: 2150, gy: 390,    text: 'Piso tátil guia quem não enxerga.' },
      { x: 2740, gy: GROUND, text: 'Carro na calçada! O único desvio é pela rua. Cuidado com o trânsito!' },
      { x: 3420, gy: GROUND, text: 'Meta à frente: prédio com entrada acessível. Chegada para TODOS.' },
    ],
    spawn: { x: 100, y: GROUND - 64 },
  };
}

// ---------- estado ----------
let L, pl, score, cam = 0, state = 'title', flash = 0, toasts = [], parts = [], tick = 0;
const keys = {};
const touch = { left: false, right: false };

function reset() {
  L = makeLevel();
  L.flags[0].on = true;
  pl = { x: 100, y: GROUND - 64, w: 34, h: 64, vx: 0, vy: 0,
         grounded: false, groundRef: null, wheel: 0, facing: 1, invuln: 0 };
  score = 0; cam = 0; flash = 0; toasts = []; parts = [];
}

// ---------- áudio (bips simples) ----------
let AC = null;
function sfx(kind) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.connect(g); g.connect(AC.destination);
    const t = AC.currentTime;
    if (kind === 'star') { o.frequency.setValueAtTime(880, t); o.frequency.linearRampToValueAtTime(1320, t + 0.12); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.start(t); o.stop(t + 0.25); }
    else if (kind === 'check') { o.frequency.setValueAtTime(520, t); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.start(t); o.stop(t + 0.2); }
    else if (kind === 'death') { o.type = 'sawtooth'; o.frequency.setValueAtTime(200, t); o.frequency.linearRampToValueAtTime(70, t + 0.3); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.start(t); o.stop(t + 0.35); }
    else if (kind === 'win') { [523, 659, 784, 1046].forEach((f, i) => { const o2 = AC.createOscillator(), g2 = AC.createGain(); o2.connect(g2); g2.connect(AC.destination); o2.frequency.value = f; g2.gain.setValueAtTime(0.1, t + i * 0.12); g2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3); o2.start(t + i * 0.12); o2.stop(t + i * 0.12 + 0.3); }); }
  } catch (e) { /* sem áudio, sem problema */ }
}

// ---------- helpers ----------
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function toast(text) {
  toasts.push({ text, t: 260 });
  if (toasts.length > 2) toasts.shift();
}

function wrap(text, max) {
  const words = text.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) { lines.push(cur.trim()); cur = w; }
    else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

function die() {
  if (pl.invuln > 0) return;
  sfx('death');
  flash = 18;
  pl.x = L.spawn.x; pl.y = L.spawn.y;
  pl.vx = 0; pl.vy = 0; pl.invuln = 50;
}

function confetti() {
  for (let i = 0; i < 140; i++) {
    parts.push({
      x: Math.random() * W, y: -20 - Math.random() * H * 0.5,
      vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 3,
      s: 4 + Math.random() * 6, r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      c: ['#ff2f9e', '#ff77c4', '#ffd0ea', '#fff', '#c22a7f'][i % 5],
    });
  }
}

// ---------- física ----------
function step(dtF) {
  tick += dtF;

  for (const e of L.elevators) {
    const prev = e.y;
    if (e.wait > 0) e.wait -= dtF;
    else {
      e.y += e.dir * e.speed * dtF;
      if (e.y <= e.minY) { e.y = e.minY; e.dir = 1; e.wait = 45; }
      if (e.y >= e.maxY) { e.y = e.maxY; e.dir = -1; e.wait = 45; }
    }
    e.dy = e.y - prev;
  }

  for (const c of L.patrols) {
    c.x += c.dir * c.speed * dtF;
    if (c.x > c.maxX) { c.x = c.maxX; c.dir = -1; }
    if (c.x < c.minX) { c.x = c.minX; c.dir = 1; }
  }

  const left = keys['arrowleft'] || keys['a'] || touch.left;
  const right = keys['arrowright'] || keys['d'] || touch.right;
  const cx = pl.x + pl.w / 2;
  let speed = MOVE;
  if (pl.grounded) {
    for (const z of L.slowZones) {
      if (cx > z.x && cx < z.x + z.w && Math.abs(pl.y + pl.h - GROUND) < 5) { speed *= SLOW; break; }
    }
  }
  const target = (right ? speed : 0) - (left ? speed : 0);
  pl.vx += (target - pl.vx) * Math.min(1, 0.25 * dtF);
  if (Math.abs(pl.vx) < 0.02) pl.vx = 0;
  if (pl.vx > 0.1) pl.facing = 1; else if (pl.vx < -0.1) pl.facing = -1;

  // eixo X
  pl.x += pl.vx * dtF;
  for (const s of L.solids) {
    if (overlap(pl, s)) {
      if (pl.grounded && pl.y + pl.h - s.y <= 14) {
        pl.y = s.y - pl.h; // auto-step: sobe rebaixamentos de até 14px
        continue;
      }
      if (pl.vx > 0) pl.x = s.x - pl.w;
      else if (pl.vx < 0) pl.x = s.x + s.w;
      pl.vx = 0;
    }
  }
  pl.x = Math.max(0, Math.min(WORLD_W - pl.w, pl.x));

  // eixo Y
  const prevBottom = pl.y + pl.h;
  pl.vy = Math.min(pl.vy + GRAV * dtF, 16);
  pl.y += pl.vy * dtF;
  pl.grounded = false; pl.groundRef = null;
  for (const s of L.solids) {
    if (overlap(pl, s)) {
      if (pl.vy >= 0 && prevBottom <= s.y + 1) {
        pl.y = s.y - pl.h; pl.vy = 0; pl.grounded = true; pl.groundRef = s;
      } else if (pl.vy < 0) {
        pl.y = s.y + s.h; pl.vy = 0;
      } else {
        pl.y = s.y - pl.h; pl.vy = 0; pl.grounded = true; pl.groundRef = s;
      }
    }
  }
  // plataformas de elevador (só pousa por cima)
  for (const e of L.elevators) {
    if (pl.vy >= e.dy && prevBottom <= e.y + 1 &&
        pl.x + pl.w > e.x + 2 && pl.x < e.x + e.w - 2 && pl.y + pl.h >= e.y) {
      pl.y = e.y - pl.h; pl.vy = 0; pl.grounded = true; pl.groundRef = e;
    }
  }
  // rampas: gruda os pés na superfície inclinada
  for (const r of L.ramps) {
    const fx = pl.x + pl.w / 2;
    if (fx >= r.x && fx <= r.x + r.w) {
      const t = (fx - r.x) / r.w;
      const surf = r.dir === 1 ? r.y + r.h * (1 - t) : r.y + r.h * t;
      const feet = pl.y + pl.h;
      if (feet >= surf - 70 && feet <= surf + 45 && pl.vy >= 0) {
        pl.y = surf - pl.h; pl.vy = 0; pl.grounded = true;
      }
    }
  }
  // elevador carrega a jogadora
  if (pl.groundRef && pl.groundRef.dy) pl.y += pl.groundRef.dy;

  pl.wheel += pl.vx * dtF * 0.05;
  if (pl.invuln > 0) pl.invuln -= dtF;

  // mortes: queda ou carro em movimento
  if (pl.y > H + 80) die();
  for (const c of L.patrols) if (overlap(pl, c)) { die(); break; }

  // estrelas
  for (const st of L.stars) {
    if (!st.taken && Math.hypot(pl.x + pl.w / 2 - st.x, pl.y + pl.h / 2 - st.y) < 36) {
      st.taken = true; score++;
      toast('★ ' + FACTS[Math.min(score - 1, FACTS.length - 1)]);
      sfx('star');
    }
  }
  // checkpoints
  for (const f of L.flags) {
    if (!f.on && pl.x > f.x) {
      f.on = true;
      L.spawn = { x: f.x, y: f.gy - pl.h };
      toast('Checkpoint!');
      sfx('check');
    }
  }
  // meta
  if (pl.x + pl.w > GOAL_X) {
    state = 'win';
    confetti();
    sfx('win');
    document.getElementById('winStars').textContent =
      `Estrelas da acessibilidade: ${score}/${L.stars.length}`;
    document.getElementById('win').classList.remove('hidden');
  }

  cam = Math.max(0, Math.min(WORLD_W - W, pl.x + pl.w / 2 - W * 0.42));
}

// ---------- desenho ----------
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, P.sky1); g.addColorStop(1, P.sky2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // sol
  ctx.fillStyle = P.sun;
  ctx.beginPath(); ctx.arc(W - 140, 90, 46, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd0ea'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(W - 140, 90, 56, 0, Math.PI * 2); ctx.stroke();
}

function drawClouds() {
  ctx.fillStyle = P.cloud;
  for (let i = 0; i < 10; i++) {
    const bx = ((i * 640 - cam * 0.3 + tick * 0.15) % (WORLD_W * 0.5 + 400)) - 200;
    const by = 50 + (i * 53) % 130;
    ctx.beginPath();
    ctx.arc(bx, by, 22, 0, Math.PI * 2);
    ctx.arc(bx + 24, by - 8, 26, 0, Math.PI * 2);
    ctx.arc(bx + 52, by, 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBuildings() {
  for (let i = 0; i < 22; i++) {
    const bw = 170 + (i * 37) % 90;
    const bh = 110 + (i * 67) % 160;
    const bx = i * 260 - cam * 0.5;
    const by = GROUND - bh - 30;
    ctx.fillStyle = P.bldg[i % P.bldg.length];
    ctx.fillRect(bx, by, bw, bh + 30);
    ctx.fillStyle = P.bldgWin;
    for (let wy = by + 16; wy < GROUND - 46; wy += 34)
      for (let wx = bx + 14; wx < bx + bw - 18; wx += 30)
        ctx.fillRect(wx, wy, 16, 20);
  }
}

function drawGround() {
  for (const s of L.solids) {
    if (s.kind === 'parkedCar' || s.kind === 'walkway' || s.kind === 'plank' || s.kind === 'stair') continue;
    const top = s.kind === 'street' ? P.street : P.groundTop;
    ctx.fillStyle = s.kind === 'street' ? P.street : P.ground;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = top;
    ctx.fillRect(s.x, s.y, s.w, 8);
    ctx.strokeStyle = s.kind === 'street' ? P.lane : P.seam;
    ctx.lineWidth = 2;
    if (s.kind === 'street') {
      for (let x = s.x + 20; x < s.x + s.w - 20; x += 46)
        ctx.strokeRect(x, s.y + 20, 24, 3);
    } else {
      ctx.beginPath();
      for (let x = s.x; x <= s.x + s.w; x += 40) {
        ctx.moveTo(x, s.y + 8); ctx.lineTo(x, s.y + 60);
      }
      ctx.stroke();
      if (s.kind === 'plaza') {
        ctx.fillStyle = P.tactile;
        for (let x = s.x + 40; x < s.x + s.w - 30; x += 18) {
          ctx.beginPath(); ctx.arc(x, s.y + 16, 4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }
  // calçada esburacada
  for (const z of L.slowZones) {
    ctx.fillStyle = P.pothole;
    ctx.beginPath();
    ctx.ellipse(z.x + z.w / 2, GROUND + 12, z.w / 2, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = P.seam; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(z.x + 6, GROUND + 4); ctx.lineTo(z.x + 18, GROUND + 10); ctx.lineTo(z.x + 12, GROUND + 18);
    ctx.stroke();
  }
  // flores decorativas na calçada
  ctx.fillStyle = '#fff0f8';
  for (let x = 300; x < WORLD_W; x += 370) {
    ctx.beginPath(); ctx.arc(x, GROUND - 6, 4, 0, Math.PI * 2); ctx.arc(x + 7, GROUND - 4, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawRamps() {
  for (const r of L.ramps) {
    ctx.fillStyle = P.ramp;
    ctx.beginPath();
    if (r.dir === 1) {
      ctx.moveTo(r.x, r.y + r.h); ctx.lineTo(r.x + r.w, r.y); ctx.lineTo(r.x + r.w, r.y + r.h);
    } else {
      ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.lineTo(r.x, r.y + r.h);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = P.rampEdge; ctx.lineWidth = 3;
    ctx.beginPath();
    if (r.dir === 1) { ctx.moveTo(r.x, r.y + r.h); ctx.lineTo(r.x + r.w, r.y); }
    else { ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.w, r.y + r.h); }
    ctx.stroke();
    // faixas antiderrapantes
    ctx.strokeStyle = '#ffe3f2'; ctx.lineWidth = 2;
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      const sx = r.x + r.w * t;
      const sy = r.dir === 1 ? r.y + r.h * (1 - t) : r.y + r.h * t;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + 14); ctx.stroke();
    }
  }
}

function drawStairs() {
  for (const s of L.solids) {
    if (s.kind !== 'stair') continue;
    ctx.fillStyle = P.stair;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = P.stairEdge; ctx.lineWidth = 3;
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const sy = s.y + (s.h / steps) * i;
      ctx.beginPath(); ctx.moveTo(s.x, sy); ctx.lineTo(s.x + s.w, sy); ctx.stroke();
      const sx = s.x + (s.w / steps) * i;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + s.h / steps); ctx.stroke();
    }
  }
  // escadinha na face da praça (decorativa, "só escada")
  ctx.strokeStyle = P.stairEdge; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.strokeRect(1900 + i * 20, 390 + i * 20, 20, 20);
  }
}

function drawWalkwayPlank() {
  for (const s of L.solids) {
    if (s.kind === 'walkway') {
      ctx.fillStyle = '#ff9ed6';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = P.rampEdge; ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
      // corrimão
      ctx.strokeStyle = P.cable; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(s.x, s.y - 22); ctx.lineTo(s.x + s.w, s.y - 22); ctx.stroke();
      for (let x = s.x + 10; x < s.x + s.w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, s.y - 22); ctx.lineTo(x, s.y); ctx.stroke();
      }
    }
    if (s.kind === 'plank') {
      ctx.fillStyle = P.plank;
      ctx.fillRect(s.x, s.y - 2, s.w, 8);
      ctx.strokeStyle = P.rampEdge; ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y - 2, s.w, 8);
      // cones de obra
      ctx.fillStyle = '#ff5fb8';
      [[1548, GROUND], [1630, GROUND]].forEach(([cx, gy]) => {
        ctx.beginPath(); ctx.moveTo(cx, gy - 26); ctx.lineTo(cx - 10, gy); ctx.lineTo(cx + 10, gy); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fff0f8'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - 6, gy - 12); ctx.lineTo(cx + 6, gy - 12); ctx.stroke();
      });
      // o buraco embaixo da tábua
      ctx.fillStyle = '#7c1e57';
      ctx.fillRect(1560, GROUND + 10, 60, 60);
    }
  }
}

function drawElevators() {
  for (const e of L.elevators) {
    // torre e cabo
    ctx.strokeStyle = P.cable; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(e.x + e.w / 2, e.cableTop); ctx.lineTo(e.x + e.w / 2, e.y - 4); ctx.stroke();
    ctx.fillStyle = P.elevDark;
    roundRect(e.x + e.w / 2 - 14, e.cableTop - 12, 28, 16, 4); ctx.fill();
    // plataforma
    ctx.fillStyle = P.elev;
    roundRect(e.x, e.y - 4, e.w, 18, 5); ctx.fill();
    ctx.strokeStyle = P.elevDark; ctx.lineWidth = 3;
    roundRect(e.x, e.y - 4, e.w, 18, 5); ctx.stroke();
    // listras
    ctx.strokeStyle = '#ffe3f2'; ctx.lineWidth = 3;
    for (let x = e.x + 8; x < e.x + e.w - 6; x += 14) {
      ctx.beginPath(); ctx.moveTo(x, e.y + 8); ctx.lineTo(x + 7, e.y - 1); ctx.stroke();
    }
  }
}

function drawSigns() {
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  for (const sg of L.signs) {
    const lines = wrap(sg.text, 32);
    const bw = 255, bh = lines.length * 15 + 14;
    const bx = sg.x, by = sg.gy - 62 - bh;
    ctx.fillStyle = P.pole;
    ctx.fillRect(bx + 10, by + bh, 6, sg.gy - by - bh);
    ctx.fillStyle = P.sign;
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = P.signEdge; ctx.lineWidth = 3;
    roundRect(bx, by, bw, bh, 8); ctx.stroke();
    ctx.fillStyle = P.signText;
    lines.forEach((ln, i) => ctx.fillText(ln, bx + 10, by + 8 + i * 15));
  }
}

function drawFlags() {
  for (const f of L.flags) {
    const fy = f.gy;
    ctx.strokeStyle = P.pole; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(f.x, fy); ctx.lineTo(f.x, fy - 58); ctx.stroke();
    ctx.fillStyle = f.on ? P.flag : '#ffb1dc';
    ctx.beginPath();
    ctx.moveTo(f.x, fy - 58); ctx.lineTo(f.x + 30, fy - 48); ctx.lineTo(f.x, fy - 38);
    ctx.closePath(); ctx.fill();
  }
}

function drawStars() {
  for (const st of L.stars) {
    if (st.taken) continue;
    const bob = Math.sin(tick * 0.06 + st.x) * 4;
    const y = st.y + bob;
    ctx.save();
    ctx.translate(st.x, y);
    ctx.rotate(Math.sin(tick * 0.03 + st.x) * 0.15);
    ctx.fillStyle = P.star;
    ctx.strokeStyle = P.starEdge; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 14 : 6;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

function drawCar(x, y, w, h, body, flip) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (flip) ctx.scale(-1, 1);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = body;
  roundRect(0, h * 0.25, w, h * 0.55, 10); ctx.fill();
  roundRect(w * 0.18, 0, w * 0.55, h * 0.4, 8); ctx.fill();
  ctx.fillStyle = P.glass;
  roundRect(w * 0.26, h * 0.08, w * 0.38, h * 0.28, 5); ctx.fill();
  ctx.fillStyle = P.tire;
  ctx.beginPath();
  ctx.arc(w * 0.22, h * 0.82, h * 0.18, 0, Math.PI * 2);
  ctx.arc(w * 0.78, h * 0.82, h * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd0ea';
  ctx.beginPath();
  ctx.arc(w * 0.22, h * 0.82, h * 0.08, 0, Math.PI * 2);
  ctx.arc(w * 0.78, h * 0.82, h * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCars() {
  for (const s of L.solids) {
    if (s.kind !== 'parkedCar') continue;
    drawCar(s.x - 10, s.y + 6, s.w + 20, s.h + 10, '#ff5fb8', false);
    // placa "proibido estacionar"
    ctx.fillStyle = P.sign;
    roundRect(s.x - 40, s.y + 6, 34, 34, 6); ctx.fill();
    ctx.strokeStyle = P.signEdge; ctx.lineWidth = 3;
    roundRect(s.x - 40, s.y + 6, 34, 34, 6); ctx.stroke();
    ctx.strokeStyle = '#ff2f9e'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(s.x - 34, s.y + 34); ctx.lineTo(s.x - 12, s.y + 12); ctx.stroke();
  }
  for (const c of L.patrols) drawCar(c.x, c.y, c.w, c.h, '#e0359a', c.dir < 0);
}

function drawGoal() {
  const gx = 4300;
  // fachada
  ctx.fillStyle = '#ef87bc';
  ctx.fillRect(gx, 170, 260, 300);
  ctx.fillStyle = P.bldgWin;
  for (let wy = 195; wy < 340; wy += 42)
    for (let wx = gx + 18; wx < gx + 240; wx += 42)
      ctx.fillRect(wx, wy, 24, 26);
  // letreiro
  ctx.fillStyle = P.sign;
  roundRect(gx + 20, 340, 220, 34, 8); ctx.fill();
  ctx.strokeStyle = P.signEdge; ctx.lineWidth = 3;
  roundRect(gx + 20, 340, 220, 34, 8); ctx.stroke();
  ctx.fillStyle = P.signText;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('CENTRO PARA TODOS', gx + 38, 349);
  // porta + rampa de acesso
  ctx.fillStyle = '#a91e6e';
  roundRect(GOAL_X - 6, 396, 72, 74, 8); ctx.fill();
  ctx.fillStyle = P.glass;
  roundRect(GOAL_X + 6, 408, 48, 50, 6); ctx.fill();
  ctx.fillStyle = P.ramp;
  ctx.beginPath();
  ctx.moveTo(GOAL_X - 66, GROUND); ctx.lineTo(GOAL_X - 6, 452); ctx.lineTo(GOAL_X - 6, GROUND);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = P.rampEdge; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(GOAL_X - 66, GROUND); ctx.lineTo(GOAL_X - 6, 452); ctx.stroke();
  // símbolo de acessibilidade na porta
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(GOAL_X + 30, 420, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(GOAL_X + 30, 438, 9, 0, Math.PI); ctx.stroke();
  // bandeira no topo
  ctx.strokeStyle = P.pole; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(gx + 130, 170); ctx.lineTo(gx + 130, 110); ctx.stroke();
  ctx.fillStyle = P.flag;
  ctx.beginPath();
  ctx.moveTo(gx + 130, 110); ctx.lineTo(gx + 180, 122); ctx.lineTo(gx + 130, 136);
  ctx.closePath(); ctx.fill();
}

function drawPlayer() {
  const { x, y } = pl;
  ctx.save();
  ctx.translate(x + pl.w / 2, y + pl.h);
  ctx.scale(pl.facing, 1);
  if (pl.invuln > 0 && Math.floor(tick / 4) % 2 === 0) ctx.globalAlpha = 0.45;

  const a = pl.wheel;
  // roda grande
  ctx.strokeStyle = P.chairDark; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(-6, -20, 15, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 3; i++) {
    const ang = a + i * Math.PI / 3;
    ctx.beginPath();
    ctx.moveTo(-6 - Math.cos(ang) * 15, -20 - Math.sin(ang) * 15);
    ctx.lineTo(-6 + Math.cos(ang) * 15, -20 + Math.sin(ang) * 15);
    ctx.stroke();
  }
  // rodinha dianteira
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(13, -8, 6, 0, Math.PI * 2); ctx.stroke();
  // estrutura da cadeira
  ctx.strokeStyle = P.chair; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-14, -34); ctx.lineTo(-14, -22); ctx.lineTo(13, -8);
  ctx.moveTo(-14, -34); ctx.lineTo(12, -34); ctx.lineTo(13, -14);
  ctx.stroke();
  // corpo
  ctx.fillStyle = P.chair;
  roundRect(-12, -52, 18, 22, 6); ctx.fill();
  // braço no aro da roda
  ctx.strokeStyle = P.skin; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-8, -46); ctx.lineTo(-12, -30); ctx.stroke();
  // cabeça
  ctx.fillStyle = P.skin;
  ctx.beginPath(); ctx.arc(-2, -58, 9, 0, Math.PI * 2); ctx.fill();
  // cabelo com rabinho
  ctx.fillStyle = P.hair;
  ctx.beginPath(); ctx.arc(-4, -62, 8, Math.PI * 0.9, Math.PI * 1.95); ctx.fill();
  ctx.beginPath(); ctx.arc(-11, -57, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = 'rgba(255,240,248,0.85)';
  roundRect(14, 12, 130, 36, 10); ctx.fill();
  ctx.strokeStyle = P.starEdge; ctx.lineWidth = 2;
  roundRect(14, 12, 130, 36, 10); ctx.stroke();
  ctx.fillStyle = P.starEdge;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', 28, 31);
  ctx.fillStyle = P.hud;
  ctx.fillText(`${score}/${L.stars.length}`, 52, 31);

  // progresso
  ctx.fillStyle = 'rgba(255,240,248,0.85)';
  roundRect(W - 224, 16, 200, 22, 10); ctx.fill();
  ctx.fillStyle = P.starEdge;
  const prog = Math.min(1, pl.x / GOAL_X);
  roundRect(W - 220, 20, 192 * prog, 14, 7); ctx.fill();
  ctx.strokeStyle = P.signEdge; ctx.lineWidth = 2;
  roundRect(W - 224, 16, 200, 22, 10); ctx.stroke();

  ctx.fillStyle = P.hud;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('← → mover   •   R recomeçar', 16, H - 12);
}

function drawToasts() {
  ctx.font = 'bold 14px system-ui, sans-serif';
  let ty = H - 78;
  for (const t of toasts) {
    const lines = wrap(t.text, 62);
    const bh = lines.length * 17 + 14;
    ctx.globalAlpha = Math.min(1, t.t / 40);
    ctx.fillStyle = 'rgba(255,240,248,0.95)';
    roundRect(W / 2 - 330, ty - bh, 660, bh, 10); ctx.fill();
    ctx.strokeStyle = P.signEdge; ctx.lineWidth = 2;
    roundRect(W / 2 - 330, ty - bh, 660, bh, 10); ctx.stroke();
    ctx.fillStyle = P.signText;
    lines.forEach((ln, i) => {
      ctx.fillText(ln, W / 2 - ctx.measureText(ln) / 2, ty - bh + 9 + i * 17);
    });
    ctx.globalAlpha = 1;
    ty -= bh + 8;
  }
}

function drawParticles() {
  for (const p of parts) {
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.r);
    ctx.fillStyle = p.c;
    ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
    ctx.restore();
  }
}

function draw() {
  drawSky();
  drawClouds();
  drawBuildings();

  ctx.save();
  ctx.translate(-cam, 0);
  drawGround();
  drawRamps();
  drawWalkwayPlank();
  drawStairs();
  drawElevators();
  drawFlags();
  drawSigns();
  drawStars();
  drawGoal();
  drawCars();
  drawPlayer();
  ctx.restore();

  drawParticles();

  ctx.fillStyle = 'rgba(255,240,248,0.5)';
  drawHUD();
  drawToasts();

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,47,158,${flash / 40})`;
    ctx.fillRect(0, 0, W, H);
    flash--;
  }
}

// ---------- loop ----------
let last = performance.now(), acc = 0;
function frame(t) {
  acc += Math.min(50, t - last);
  last = t;
  if (state === 'play') {
    while (acc >= 16.666) { step(1); acc -= 16.666; }
  } else {
    acc = 0;
    tick += 0.6;
  }
  for (const tt of toasts) tt.t -= 0.6;
  while (toasts.length && toasts[0].t <= 0) toasts.shift();
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.r += p.vr; }
  parts = parts.filter(p => p.y < H + 40);
  draw();
  requestAnimationFrame(frame);
}

// ---------- input ----------
function start() {
  if (state === 'title') {
    state = 'play';
    document.getElementById('title').classList.add('hidden');
  } else if (state === 'win') {
    document.getElementById('win').classList.add('hidden');
    reset();
    state = 'play';
  }
}

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
  keys[k] = true;
  if ((k === 'enter' || k === ' ') && state !== 'play') start();
  else if (k === 'r' && state === 'play') { reset(); }
  else if (k === 'r' && state === 'win') { start(); }
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

document.getElementById('play').addEventListener('click', start);
document.getElementById('again').addEventListener('click', start);

const bindBtn = (id, prop) => {
  const el = document.getElementById(id);
  const on = e => { e.preventDefault(); touch[prop] = true; };
  const off = e => { e.preventDefault(); touch[prop] = false; };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('pointercancel', off);
};
bindBtn('tleft', 'left');
bindBtn('tright', 'right');
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');

reset();
requestAnimationFrame(frame);

})();
