// First-time tutorial (phone): the assistant walks a new boss through the first minute.
//
//   intro → catch the first slacker → don't whip workers → starter fund → upgrade the whip
//   → take a project → done (+gems gift)
//
// Each step shows a speech card from the assistant and, where something must be tapped, a
// spotlight with a bouncing finger. Taps outside the spotlight are blocked so the player can't
// get lost. The simulation waits while a step is open (main.js asks tutorial.blocking).
// Progress is polled from the game state, so it can't miss an event; the step index is saved
// in g.tutorial (99 = finished / skipped).
import { t } from './i18n.js';
import { itemArtUrl } from './item-art.js';
import { WHIPS } from './config.js';

export const TUTORIAL_DONE = 99;

// pixel-art pointing hand (white glove, dark outline), tip at the top-left corner
const FINGER = (() => {
  const px = [
    '..##........', '.#ww#.......', '.#ww#.......', '.#ww#.......', '.#ww###.....', '.#ww#ww##...',
    '##ww#ww#w##.', '#wwwwwwwww#.', '#wwwwwwwww#.', '.#wwwwwwww#.', '.#wwwwwwww#.', '..#wwwwww#..', '..########..',
  ];
  let r = '';
  px.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c === '#' ? '#1d1826' : '#ffffff'}"/>`; }));
  return `<svg viewBox="0 0 12 13" shape-rendering="crispEdges" width="100%" height="100%">${r}</svg>`;
})();
const STARTER_FUND = 500;   // enough for the first whip upgrade
const GIFT_GEMS = 10;

/** Should this save run the tutorial? New games only (old saves skip it). */
export function needsTutorial(g) {
  if (g.tutorial === undefined) g.tutorial = g.day > 1 || g.records.totalWhips > 0 ? TUTORIAL_DONE : 0;
  return g.tutorial < TUTORIAL_DONE;
}

export function createTutorial({ g, view, onSave, onGems, slackFor }) {
  const root = document.createElement('div');
  root.id = 'tut';
  root.innerHTML = `
    <div class="tut-block" data-b="0"></div><div class="tut-block" data-b="1"></div>
    <div class="tut-block" data-b="2"></div><div class="tut-block" data-b="3"></div>
    <div class="tut-hole"></div>
    <div class="tut-finger">${FINGER}</div>
    <div class="tut-card">
      <img class="tut-face" src="${itemArtUrl('assistant:0')}" alt="">
      <div class="tut-body">
        <div class="tut-name">${t('Trợ lý Hạnh')}</div>
        <div class="tut-text"></div>
        <div class="tut-actions">
          <button class="px-btn tut-skip" data-t="skip">${t('Bỏ qua')}</button>
          <button class="px-btn tut-next" data-t="next"></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const card = $('.tut-card'), text = $('.tut-text'), next = $('.tut-next'), hole = $('.tut-hole'), finger = $('.tut-finger');
  const blocks = [...root.querySelectorAll('.tut-block')];
  // keep taps on the tutorial layer away from the office canvas underneath
  root.addEventListener('pointerdown', (e) => { if (!e.target.closest('.tut-card')) e.stopPropagation(); });

  const firstSlacker = () => g.staff[0];
  const startCatches = () => g.records.catches;
  let base = {};

  /**
   * Steps: text, button label (null = wait for an action), target() → DOM rect or null,
   * enter() side effects, done() → true when the player did the action.
   */
  const STEPS = [
    { // 0
      text: () => t('Chào Sếp! Đây là công ty khởi nghiệp của Sếp: 3 nhân viên, quỹ 0 đồng. Việc của Sếp: giữ cho mọi người làm việc, kiếm tiền và mở rộng công ty!'),
      button: () => t('Bắt đầu thôi'),
    },
    { // 1: catch a slacker
      enter() {
        base.catches = startCatches();
        slackFor(firstSlacker(), 'game');
      },
      text: () => t('Ơ kìa! {name} đang lén chơi game. Ai có bong bóng trên đầu là đang lười. Chạm vào người đó để quất!', { name: firstSlacker().name }),
      target: () => staffRect(firstSlacker()),
      done: () => g.records.catches > base.catches,
    },
    { // 2
      text: () => t('Tuyệt vời! Bắt quả tang được thưởng tiền, quất liên tiếp nhiều người thì combo càng cao. Nhưng nhớ: quất oan người đang làm sẽ bị phạt, họ tức giận và có thể đình công.'),
      button: () => t('Đã hiểu'),
    },
    { // 3: starter fund
      enter() { g.money += STARTER_FUND; g.lifetimeEarnings += STARTER_FUND; },
      text: () => t('Nhà đầu tư vừa rót {m} đ cho công ty! Mình đi nâng cấp cây roi nhé. Mở mục Quản lý.', { m: STARTER_FUND }),
      target: () => el('#panel:not([hidden]) [data-a="buy"][data-arg="whip"]') || el('.tab[data-a="shop"]'),
      text2: () => (el('#panel:not([hidden])') ? t('Mua {w}: thưởng bắt quả tang cao hơn, quất trúng dễ hơn.', { w: t(WHIPS[1].name) }) : null),
      done: () => g.whipLevel >= 1,
    },
    { // 4: take a project
      enter() { if (document.querySelector('#panel:not([hidden])')) document.querySelector('#panel [data-a="shop"]')?.click(); },
      text: () => t('Roi mới đây rồi! Giờ nhận một dự án: nhân viên làm việc sẽ đẩy tiến độ, xong trước hạn được thưởng tiền. Mở mục Dự án.'),
      target: () => el('#modal:not([hidden]) [data-a="projAccept"]') || el('.tab[data-a="projects"]'),
      text2: () => (el('#modal:not([hidden]) [data-a="projAccept"]') ? t('Chọn một hợp đồng và bấm Nhận. Để ý số ngày và mức phạt nếu trễ hạn!') : null),
      done: () => g.rooms.some((r) => r.project),
    },
    { // 5
      enter() { if (!document.querySelector('#modal[hidden]')) document.querySelector('#modal [data-a="closeScreen"]')?.click(); },
      text: () => t('Xong! 18:00 tan ca sẽ có báo cáo cuối ngày. Thỉnh thoảng thanh tra sẽ ghé bất ngờ đấy. Đây là quà ra mắt Sếp mới: +{n} kim cương. Chúc Sếp thành công!', { n: GIFT_GEMS }),
      button: () => t('Vào làm việc!'),
      leave() { onGems(GIFT_GEMS); },
    },
  ];

  const el = (sel) => document.querySelector(sel);
  function staffRect(e) {
    const h = view.hits.find((x) => x.e === e);
    if (!h) return null;
    const a = view.toClient(h.x0, h.y0), b = view.toClient(h.x1, h.y1);
    return { left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y };
  }

  let step = -1;
  function go(i) {
    if (step >= 0 && STEPS[step]?.leave) STEPS[step].leave();
    step = i;
    g.tutorial = i;
    if (i >= STEPS.length) return finish();
    const s = STEPS[i];
    if (s.enter) s.enter();
    root.hidden = false;
    render();
    onSave();
  }
  function finish() {
    g.tutorial = TUTORIAL_DONE;
    root.remove();
    api.active = false;
    onSave();
  }

  let lastText = '';
  function render() {
    const s = STEPS[step];
    const msg = (s.text2 && s.text2()) || s.text();
    if (msg !== lastText) { text.textContent = msg; lastText = msg; card.classList.remove('tut-pop'); void card.offsetWidth; card.classList.add('tut-pop'); }
    next.hidden = !s.button;
    if (s.button) next.textContent = s.button();
    // spotlight + finger
    const r = s.target ? s.target() : null;
    const rect = r && (r.getBoundingClientRect ? r.getBoundingClientRect() : r);
    root.classList.toggle('full', !rect || !rect.width);
    if (rect && rect.width) {
      const pad = 6, x = rect.left - pad, y = rect.top - pad, w = rect.width + pad * 2, h = rect.height + pad * 2;
      Object.assign(hole.style, { display: 'block', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      Object.assign(finger.style, { display: 'block', left: x + w / 2 + 'px', top: y + h / 2 + 'px' });
      // blockers around the hole: everything except the target ignores taps
      const W = innerWidth, H = innerHeight;
      const boxes = [[0, 0, W, y], [0, y + h, W, H - y - h], [0, y, x, h], [x + w, y, W - x - w, h]];
      blocks.forEach((b, k) => { const [l, tp, bw, bh] = boxes[k]; Object.assign(b.style, { display: 'block', left: l + 'px', top: tp + 'px', width: Math.max(0, bw) + 'px', height: Math.max(0, bh) + 'px' }); });
      // card goes to the half of the screen away from the target
      card.classList.toggle('top', y + h / 2 > H * 0.5);
    } else {
      hole.style.display = 'none'; finger.style.display = 'none';
      // a step with nothing to tap: the whole screen is blocked except the card
      blocks.forEach((b, k) => Object.assign(b.style, k ? { display: 'none' } : { display: 'block', left: 0, top: 0, width: '100%', height: '100%' }));
      card.classList.remove('top');
    }
  }

  root.addEventListener('click', (e) => {
    const k = e.target.closest('[data-t]')?.dataset.t;
    if (k === 'next') go(step + 1);
    if (k === 'skip') {
      // skipping still hands out the starter fund (if not given yet) and the gift
      if (step < 3) { g.money += STARTER_FUND; g.lifetimeEarnings += STARTER_FUND; }
      onGems(GIFT_GEMS);
      finish();
    }
  });

  const api = {
    active: true,
    /** True while the game should wait (every step: the tutorial is short and guided). */
    get blocking() { return api.active && step >= 0; },
    start() { go(Math.max(0, Math.min(g.tutorial || 0, STEPS.length - 1))); },
    /** ~10x per second from the game loop. */
    update() {
      if (!api.active || step < 0) return;
      const s = STEPS[step];
      if (s.done && s.done()) { go(step + 1); return; }
      render();
    },
  };
  return api;
}
