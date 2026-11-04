// Title screen (phone): animated night skyline, the logo cracking its whip, the game name and
// a big start button, plus sound / music / language toggles. The simulation waits until the
// player taps start (main.js → onTitle).
import { drawLogo, drawTitle, titleSize } from './brand.js';
import { PRIVACY_URL } from './config.js';
import { t, getLang, LANGS } from './i18n.js';
import { hash } from './pixel.js';

const W = 120; // background canvas width in pixels (height follows the screen's aspect)

/** Skyline, stars and drifting coins, drawn on a tiny canvas scaled up crisply. */
function drawBackground(ctx, w, h, time) {
  const bands = ['#120d20', '#160f27', '#1b132f', '#211738', '#271b42', '#2d1f4c'];
  const bh = Math.ceil(h * 0.62 / bands.length);
  bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * bh, w, bh + 1); });
  ctx.fillStyle = bands[bands.length - 1];
  ctx.fillRect(0, bands.length * bh, w, h);
  // stars
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(hash(i * 3 + 1) * w), y = Math.floor(hash(i * 7 + 2) * h * 0.55);
    const tw = Math.sin(time * (1 + hash(i) * 2) + i) > 0.6;
    ctx.fillStyle = tw ? '#ffffff' : '#6c5a9a';
    ctx.fillRect(x, y, 1, 1);
  }
  // moon
  const mx = w - 16, my = 5;
  ctx.fillStyle = '#ffe9a8'; ctx.fillRect(mx, my + 1, 9, 7); ctx.fillRect(mx + 1, my, 7, 9);
  ctx.fillStyle = '#e8cf86'; ctx.fillRect(mx + 2, my + 3, 2, 2); ctx.fillRect(mx + 6, my + 6, 1, 1);
  // two rows of buildings with lit windows (some flicker on and off)
  const rows = [{ base: h * 0.74, max: h * 0.3, col: '#241a3d', win: '#5a4a8a', seed: 10 }, { base: h * 0.84, max: h * 0.26, col: '#1a1230', win: '#ffd34d', seed: 50 }];
  for (const r of rows) {
    let x = -4, k = r.seed;
    while (x < w) {
      const bw = 10 + Math.floor(hash(k++) * 14), bhgt = Math.floor(r.max * (0.35 + hash(k++) * 0.65));
      const top = Math.floor(r.base - bhgt);
      ctx.fillStyle = r.col; ctx.fillRect(x, top, bw, h - top);
      if (hash(k) > 0.6) ctx.fillRect(x + Math.floor(bw / 2) - 1, top - 4, 1, 4); // antenna
      for (let wy = top + 3; wy < h - 4; wy += 4) {
        for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
          const n = hash(wx * 13 + wy * 7 + r.seed);
          const on = n > 0.55 && !(n > 0.93 && Math.floor(time * 0.8 + n * 10) % 3 === 0);
          if (on) { ctx.fillStyle = r.win; ctx.fillRect(wx, wy, 1, 2); }
        }
      }
      x += bw + 1;
    }
  }
  // street
  ctx.fillStyle = '#100b1c'; ctx.fillRect(0, Math.floor(h * 0.93), w, h);
  ctx.fillStyle = '#3a2d5c';
  for (let x = Math.floor(-time * 10) % 8; x < w; x += 8) ctx.fillRect(x, Math.floor(h * 0.96), 4, 1);
  // falling coins: the boss's profits
  for (let i = 0; i < 9; i++) {
    const speed = 8 + hash(i * 5) * 10;
    const x = Math.floor(hash(i * 11 + 3) * (w - 4));
    const y = Math.floor(((time * speed + hash(i) * h) % (h + 10)) - 10);
    const flip = Math.floor(time * 6 + i) % 4;
    ctx.fillStyle = '#c8862a'; ctx.fillRect(x, y, flip === 1 || flip === 3 ? 1 : 3, 3);
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(x, y, flip === 1 || flip === 3 ? 1 : 2, 2);
  }
}

/**
 * Show the title screen. opts: { g, fmt, onStart, onToggleSound, onToggleMusic, onLang, onTap }.
 * Returns { close() }.
 */
export function showTitle({ g, fmt, onStart, onToggleSound, onToggleMusic, onLang, onTap }) {
  const el = document.createElement('div');
  el.id = 'title';
  const progress = g.day > 1 || (g.lifetimeEarnings || 0) > 0;
  const langs = Object.keys(LANGS);
  el.innerHTML = `
    <canvas class="title-bg"></canvas>
    <div class="title-top">
      <canvas class="title-logo" width="64" height="64"></canvas>
      <h1 class="title-name"><canvas aria-label="Whip Boss"></canvas></h1>
      <p class="title-tag">${t('Quản lý văn phòng bằng… cây roi!')}</p>
    </div>
    <div class="title-menu">
      <button class="px-btn title-play" data-k="play">${progress ? t('Chơi tiếp') : t('Bắt đầu')}</button>
      ${progress ? `<div class="title-save">${t('Ngày {n}', { n: g.day })} · ${fmt(g.money)} đ</div>` : `<div class="title-save">${t('Bắt quả tang · Quất · Giữ KPI')}</div>`}
      <div class="title-row">
        <button class="px-btn" data-k="sound"></button>
        <button class="px-btn" data-k="music"></button>
        <button class="px-btn" data-k="lang">🌐 ${LANGS[getLang()].name}</button>
      </div>
      <div class="title-langs" hidden>${langs.map((c) => `<button class="px-btn ${c === getLang() ? 'on' : ''}" data-k="pick" data-lang="${c}">${LANGS[c].name}</button>`).join('')}</div>
    </div>
    <div class="title-foot">v1.0.7 · © Whip Boss · <a href="${PRIVACY_URL}" target="_blank" rel="noopener">${t('Quyền riêng tư')}</a></div>`;
  document.body.appendChild(el);

  const labels = () => {
    el.querySelector('[data-k="sound"]').textContent = `${t('Âm thanh')}: ${g.muted ? t('Tắt') : t('Bật')}`;
    el.querySelector('[data-k="music"]').textContent = `${t('Nhạc')}: ${g.musicOff ? t('Tắt') : t('Bật')}`;
  };
  labels();

  const name = el.querySelector('.title-name canvas');
  const ts = titleSize();
  name.width = ts.w; name.height = ts.h;
  drawTitle(name.getContext('2d'), 0, 0, 1);

  const bg = el.querySelector('.title-bg');
  const bctx = bg.getContext('2d');
  const logo = el.querySelector('.title-logo');
  const lctx = logo.getContext('2d');
  const size = () => { bg.width = W; bg.height = Math.max(120, Math.round((W * innerHeight) / Math.max(1, innerWidth))); };
  size();
  addEventListener('resize', size);

  let raf = 0, closing = false;
  const t0 = performance.now();
  const loop = (now) => {
    const time = (now - t0) / 1000;
    drawBackground(bctx, bg.width, bg.height, time);
    lctx.clearRect(0, 0, 64, 64);
    drawLogo(lctx, 0, 0, 64, { t: time + 1 });
    // whip crack every 2.4 s: the logo jolts
    el.classList.toggle('crack', time % 2.4 < 0.18);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  el.addEventListener('pointerdown', (e) => { e.stopPropagation(); onTap && onTap(); });
  el.addEventListener('click', (e) => {
    const k = e.target.closest('[data-k]')?.dataset.k;
    if (k === 'sound') { onToggleSound(); labels(); }
    if (k === 'music') { onToggleMusic(); labels(); }
    if (k === 'lang') { const box = el.querySelector('.title-langs'); box.hidden = !box.hidden; }
    if (k === 'pick') { const c = e.target.closest('[data-lang]').dataset.lang; if (c !== getLang()) onLang(c); else el.querySelector('.title-langs').hidden = true; }
    if (k === 'play' && !closing) {
      closing = true;
      el.classList.add('leaving');
      onStart();
      setTimeout(api.close, 450);
    }
  });

  const api = {
    close() {
      cancelAnimationFrame(raf);
      removeEventListener('resize', size);
      el.remove();
    },
  };
  return api;
}
