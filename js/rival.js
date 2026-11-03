// Rival company "Lười Corp": from day RIVAL.fromDay, some days they try to poach your best
// employee (highest skill, never the nephew). The office pauses and you choose:
//   raise  — guaranteed: the employee gets a raise level (raise cost)
//   bonus  — cheaper cash bonus; they stay with a chance that grows with their motivation
//   let go — they leave; you get a small transfer fee, the team is a bit shaken
import { RIVAL, TUNING } from './config.js';
import { actionCost } from './staff.js';
import { t } from './i18n.js';

const dayMult = (g) => 1 + TUNING.dayMult * (g.day - 1);

/** Morning: maybe plan a poaching attempt for today. */
export function planRival(g) {
  g.rivalPlan = null;
  if (g.day < RIVAL.fromDay || g.staff.length < 3 || Math.random() >= RIVAL.chance) return;
  g.rivalPlan = { day: g.day, at: TUNING.dayLength * (0.35 + Math.random() * 0.4) };
}

/** The employee they want: best skill, not the nephew. */
export function target(g) {
  const pool = g.staff.filter((e) => !(e.cv && e.cv.type === 'nephew'));
  return pool.sort((a, b) => (b.cv.skill || 3) - (a.cv.skill || 3) || (b.cv.star ? 1 : 0) - (a.cv.star ? 1 : 0))[0] || null;
}

export const bonusCost = (g) => Math.round((RIVAL.bonus * dayMult(g)) / 10) * 10;
export const transferFee = (g) => Math.round((RIVAL.fee * dayMult(g)) / 10) * 10;
export const stayChance = (e) => Math.min(0.95, 0.35 + (e.motiv ?? 50) / 160);

/** Resolve the player's choice. Returns { kept, cost, fee }. */
export function resolve(g, e, choice) {
  g.records.poachTries = (g.records.poachTries || 0) + 1;
  if (choice === 'raise') {
    const cost = actionCost(g, 'raise', e);
    if (g.money < cost) return null;
    g.money -= cost; e.wage = (e.wage || 0) + 1; e.motiv = Math.min(100, (e.motiv ?? 50) + 20);
    g.records.poachKept = (g.records.poachKept || 0) + 1;
    return { kept: true, cost };
  }
  if (choice === 'bonus') {
    const cost = bonusCost(g);
    if (g.money < cost) return null;
    g.money -= cost;
    e.motiv = Math.min(100, (e.motiv ?? 50) + 25);
    const kept = Math.random() < stayChance(e);
    if (kept) { g.records.poachKept = (g.records.poachKept || 0) + 1; return { kept, cost }; }
    return { kept, cost, ...leave(g, e) };
  }
  return { kept: false, cost: 0, ...leave(g, e) };
}

function leave(g, e) {
  const i = g.staff.indexOf(e);
  if (i >= 0) g.staff.splice(i, 1);
  if (g.depts && g.depts[e.role] === e.id) delete g.depts[e.role];
  for (const x of g.staff) x.motiv = Math.max(0, (x.motiv ?? 50) - 5);
  const fee = transferFee(g);
  g.money += fee;
  g.records.poachLost = (g.records.poachLost || 0) + 1;
  return { fee, left: true };
}

/** The decision card (own layer). onChoose(choice) is called with 'raise' | 'bonus' | 'go'. */
export function showOffer(g, e, fmt, onChoose) {
  let el = document.getElementById('rival');
  if (!el) { el = document.createElement('div'); el.id = 'rival'; document.body.appendChild(el); el.addEventListener('pointerdown', (ev) => ev.stopPropagation()); }
  const raise = actionCost(g, 'raise', e), bonus = bonusCost(g);
  el.innerHTML = `<div class="reward-card rival-card">
      <div class="reward-rays"></div>
      <h2>${t('ĐỐI THỦ CHIÊU MỘ!')}</h2>
      <div class="reward-proj">${t('Công ty "Lười Corp" mời {name} sang làm với lương gấp đôi. Giữ người hay để đi?', { name: e.nickname || e.name })}
        <br><small>${t('Kỹ năng {s}★ · động lực {m}', { s: e.cv.skill, m: Math.round(e.motiv ?? 50) })}</small></div>
      <button class="px-btn big" data-r="raise" ${g.money < raise ? 'disabled' : ''}>${t('Tăng lương giữ người · {m} đ', { m: fmt(raise) })}</button>
      <button class="px-btn ad wide" data-r="bonus" ${g.money < bonus ? 'disabled' : ''}>${t('Thưởng nóng · {m} đ ({p}% ở lại)', { m: fmt(bonus), p: Math.round(stayChance(e) * 100) })}</button>
      <button class="px-btn" data-r="go">${t('Để họ đi (nhận {m} đ phí chuyển nhượng)', { m: fmt(transferFee(g)) })}</button>
    </div>`;
  el.hidden = false;
  el.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => { el.hidden = true; onChoose(b.dataset.r); }, { once: true }));
}
export function hideOffer() { const el = document.getElementById('rival'); if (el) el.hidden = true; }
