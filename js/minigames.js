// Mid-day mini-games: from day 3, most days one short event pops up at a random time. The
// player can play or skip; the office waits meanwhile (main.js → miniOpen).
//   mouse   — "Săn chuột": a mouse dashes around the office, tap it 6 times in 10 s
//   tabs    — "Kiểm tra máy tính": 3 rounds of 6 windows, find the one playing a game
//   meeting — "Họp giao ban": stop the marker in the green zone, 4 times
// play(kind, onDone) builds the DOM, plays, and calls onDone({ score, max }).
import { t } from './i18n.js';

export const MINI_KINDS = ['mouse', 'tabs', 'meeting'];

export const MINI_INFO = {
  mouse: { title: 'Săn chuột!', text: 'Một con chuột đang chạy khắp văn phòng, nhân viên la hét bỏ việc. Chạm trúng nó 6 lần trong 10 giây!', reward: 'Thưởng tiền + kim cương nếu bắt đủ' },
  tabs: { title: 'Kiểm tra máy tính', text: 'Sếp đi kiểm tra đột xuất: mỗi lượt tìm màn hình đang chơi game thật nhanh (3 lượt).', reward: 'Mỗi lần đúng: cả phòng thêm động lực' },
  meeting: { title: 'Họp giao ban', text: 'Chạm đúng lúc vạch chạy vào ô xanh để bài phát biểu thật "truyền lửa" (4 lần).', reward: 'Mỗi lần trúng: cả phòng hăng say làm việc' },
};

// --- pixel art --------------------------------------------------------------------------------
const pxSvg = (rows, colors, w, h) => {
  let r = '';
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[c]}"/>`; }));
  return `<svg viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" width="100%" height="100%">${r}</svg>`;
};
const MOUSE = pxSvg([
  '..##.........', '.#pp#........', '.#pp#####....', '..#ggggggg#..', '.#gggggggggg#', '#kgggggggggg#', '#ggggggggggg#.', '.##########...', '..#.#...#.#.#', '............##',
], { '#': '#1d1826', p: '#ff9aa8', g: '#9a96aa', k: '#111' }, 14, 10);
const WINDOW_ART = {
  code: ['#########', '#bbbbbbb#', '#gg.yyy.#', '#.bbb.gg#', '#yy.bbbb#', '#.ggg.bb#', '#########'],
  sheet: ['#########', '#ggggggg#', '#w#w#w#w#', '#########', '#w#w#w#w#', '#########', '#w#w#w#w#'],
  design: ['#########', '#wwwwwww#', '#wrrwwbw#', '#wrrwbbw#', '#wwwwbbw#', '#wyyyyyw#', '#########'],
  mail: ['#########', '#wwwwwww#', '#w#www#w#', '#ww#w#ww#', '#www#www#', '#wwwwwww#', '#########'],
  chart: ['#########', '#wwwwwgw#', '#wwwwgww#', '#wgwgwww#', '#wwgwwww#', '#wwwwwww#', '#########'],
  game: ['#########', '#kkkkkkk#', '#kw.kpk.#', '#www.kkp#', '#kw.kkkk#', '#kkkkkrk#', '#########'],
};
const WIN_COLORS = { '#': '#2a2836', b: '#3d6fd6', g: '#46b37a', y: '#ffd34d', w: '#f4f1ea', r: '#e0607e', k: '#15151c', p: '#ff3d7f', '.': 'none' };
const windowSvg = (kind) => pxSvg(WINDOW_ART[kind].map((r) => r.replace(/\./g, kind === 'game' ? 'k' : 'w')), WIN_COLORS, 9, 7);

// --- games ----------------------------------------------------------------------------------------
function layer() {
  let el = document.getElementById('mini');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mini';
    document.body.appendChild(el);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
  }
  el.hidden = false;
  return el;
}
export function closeMini() { const el = document.getElementById('mini'); if (el) { el.hidden = true; el.innerHTML = ''; } }

/** Intro card: Play / Skip. */
export function offer(kind, onPlay, onSkip) {
  const info = MINI_INFO[kind];
  const el = layer();
  el.innerHTML = `<div class="reward-card mini-card">
      <div class="reward-rays"></div>
      <h2>${t(info.title)}</h2>
      <div class="reward-proj">${t(info.text)}<br><small>${t(info.reward)}</small></div>
      <button class="px-btn big" data-m="play">${t('Chơi ngay')}</button>
      <button class="px-btn" data-m="skip">${t('Bỏ qua')}</button>
    </div>`;
  el.querySelector('[data-m="play"]').onclick = () => onPlay();
  el.querySelector('[data-m="skip"]').onclick = () => { closeMini(); onSkip(); };
}

export function play(kind, onDone) {
  ({ mouse: playMouse, tabs: playTabs, meeting: playMeeting })[kind](layer(), onDone);
}

function hud(el, title) {
  el.innerHTML = `<div class="mini-arena"><div class="mini-top"><b>${t(title)}</b><span class="mini-score"></span><span class="mini-time"><i></i></span></div><div class="mini-field"></div></div>`;
  return { field: el.querySelector('.mini-field'), score: el.querySelector('.mini-score'), time: el.querySelector('.mini-time i') };
}

function playMouse(el, onDone) {
  const H = hud(el, 'Săn chuột!'), MAX = 6, TIME = 10;
  let score = 0, start = performance.now(), over = false;
  const m = document.createElement('button');
  m.className = 'mini-mouse';
  m.innerHTML = MOUSE;
  H.field.appendChild(m);
  const jump = () => {
    const fw = H.field.clientWidth - 70, fh = H.field.clientHeight - 50;
    m.style.left = Math.round(Math.random() * Math.max(10, fw)) + 'px';
    m.style.top = Math.round(Math.random() * Math.max(10, fh)) + 'px';
    m.classList.toggle('flip', Math.random() < 0.5);
  };
  jump();
  const hop = setInterval(jump, 850);
  m.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (over) return;
    score++;
    m.classList.add('hit'); setTimeout(() => m.classList.remove('hit'), 150);
    jump();
    if (score >= MAX) end();
  });
  const tick = setInterval(() => {
    const left = TIME - (performance.now() - start) / 1000;
    H.score.textContent = `${score}/${MAX}`;
    H.time.style.width = Math.max(0, (left / TIME) * 100) + '%';
    if (left <= 0) end();
  }, 100);
  function end() { if (over) return; over = true; clearInterval(hop); clearInterval(tick); onDone({ score, max: MAX }); }
}

function playTabs(el, onDone) {
  const H = hud(el, 'Kiểm tra máy tính'), ROUNDS = 3, TIME = 2.5;
  let round = 0, score = 0, over = false, timer = 0, start = 0;
  const kinds = Object.keys(WINDOW_ART).filter((k) => k !== 'game');
  const next = () => {
    if (round >= ROUNDS) { over = true; clearInterval(timer); onDone({ score, max: ROUNDS }); return; }
    round++;
    const game = Math.floor(Math.random() * 6);
    H.field.innerHTML = `<div class="mini-tabs">${Array.from({ length: 6 }, (_, i) => `<button class="mini-win" data-i="${i}">${windowSvg(i === game ? 'game' : kinds[(i + round) % kinds.length])}</button>`).join('')}</div>`;
    H.score.textContent = `${t('Lượt')} ${round}/${ROUNDS} · ✓ ${score}`;
    start = performance.now();
    H.field.querySelectorAll('.mini-win').forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (over) return;
      const right = Number(b.dataset.i) === game;
      if (right) score++;
      b.classList.add(right ? 'right' : 'wrong');
      setTimeout(next, 350);
    }, { once: true }));
  };
  timer = setInterval(() => {
    const left = TIME - (performance.now() - start) / 1000;
    H.time.style.width = Math.max(0, (left / TIME) * 100) + '%';
    if (left <= 0 && !over) { start = performance.now() + 1e9; next(); }
  }, 80);
  next();
}

function playMeeting(el, onDone) {
  const H = hud(el, 'Họp giao ban'), TRIES = 4;
  let tries = 0, score = 0, pos = 0, dir = 1, over = false, zone = 0;
  H.field.innerHTML = `<div class="mini-meet"><div class="mini-bar"><i class="zone"></i><i class="mark"></i></div><button class="px-btn big" data-m="tap">${t('Phát biểu!')}</button></div>`;
  const bar = H.field.querySelector('.mini-bar'), zoneEl = bar.querySelector('.zone'), mark = bar.querySelector('.mark');
  const newZone = () => { zone = 10 + Math.random() * 65; zoneEl.style.left = zone + '%'; };
  newZone();
  H.time.style.width = '100%';
  const speed = 90; // % per second
  let last = performance.now();
  const loop = (now) => {
    if (over) return;
    pos += dir * speed * ((now - last) / 1000); last = now;
    if (pos > 100) { pos = 100; dir = -1; } else if (pos < 0) { pos = 0; dir = 1; }
    mark.style.left = pos + '%';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  H.score.textContent = `0/${TRIES}`;
  H.field.querySelector('[data-m="tap"]').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (over) return;
    tries++;
    const hit = pos >= zone && pos <= zone + 18;
    if (hit) score++;
    bar.classList.remove('good', 'bad'); void bar.offsetWidth; bar.classList.add(hit ? 'good' : 'bad');
    H.score.textContent = `${score}/${TRIES}`;
    H.time.style.width = ((TRIES - tries) / TRIES) * 100 + '%';
    newZone();
    if (tries >= TRIES) { over = true; setTimeout(() => onDone({ score, max: TRIES }), 300); }
  });
}
