// Boss skills: the boss earns XP (catches, projects, the weekly boss, campaign stars), levels
// up and spends one skill point per level on the skill tree below.
//
//   g.sk = { xp, lvl, pts, ranks: { id: rank }, roarCd }


export const SKILLS = [
  { id: 'hawk', name: 'Mắt diều hâu', max: 5, desc: 'Thấy dấu "!" trên đầu người sắp lười. Mỗi cấp: tiền bắt quả tang +3%.' },
  { id: 'charisma', name: 'Lãnh đạo truyền cảm hứng', max: 5, desc: 'Mỗi cấp: động lực nền của nhân viên +4.' },
  { id: 'discipline', name: 'Kỷ luật mềm', max: 5, desc: 'Mỗi cấp: quất oan gây ít áp lực hơn 8%.' },
  { id: 'business', name: 'Đàm phán', max: 5, desc: 'Mỗi cấp: tiền thưởng dự án +6%.' },
  { id: 'roar', name: 'Tiếng gầm', max: 3, active: true, desc: 'Kỹ năng chủ động: cả phòng giật mình quay lại làm việc và hăng say 10 giây. Mỗi cấp: hồi chiêu nhanh hơn.' },
];

export const XP = { catch: 1, project: 20, boss: 50, star: 15, mini: 8 };
/** XP needed to go from level n to n+1. */
export const xpFor = (n) => Math.round(60 * Math.pow(n, 1.35));

export function skState(g) {
  if (!g.sk) g.sk = { xp: 0, lvl: 1, pts: 0, ranks: {}, roarCd: 0 };
  return g.sk;
}
export const rank = (g, id) => (g.sk && g.sk.ranks[id]) || 0;

/** Add XP; returns the number of levels gained. */
export function addXp(g, n) {
  const s = skState(g);
  s.xp += n;
  let up = 0;
  while (s.xp >= xpFor(s.lvl)) { s.xp -= xpFor(s.lvl); s.lvl++; s.pts++; up++; }
  return up;
}

export function learn(g, id) {
  const s = skState(g), def = SKILLS.find((x) => x.id === id);
  if (!def || s.pts <= 0 || rank(g, id) >= def.max) return false;
  s.ranks[id] = rank(g, id) + 1;
  s.pts--;
  return true;
}

// --- Roar (active) --------------------------------------------------------------------------------
export const roarCooldown = (g) => 90 - 15 * (rank(g, 'roar') - 1);
export function roar(g) {
  const s = skState(g);
  if (!rank(g, 'roar') || s.roarCd > 0) return 0;
  let woken = 0;
  for (const e of g.staff) {
    if (e.cv && e.cv.type === 'nephew') continue;
    if (e.state === 'slack' || e.state === 'angry') { e.state = 'work'; e.t = 0; e.slack = null; e.halfCaught = false; woken++; }
    if (e.state === 'work') e.boost = Math.max(e.boost, 10);
  }
  s.roarCd = roarCooldown(g);
  return woken;
}
export function tickSkills(g, dt) { if (g.sk && g.sk.roarCd > 0) g.sk.roarCd = Math.max(0, g.sk.roarCd - dt); }

// --- passive effects (used by sim.js / projects.js / view.js) -----------------------------------
export const catchMult = (g) => 1 + 0.03 * rank(g, 'hawk');
export const motivBonus = (g) => 4 * rank(g, 'charisma');
export const wrongStressMult = (g) => 1 - 0.08 * rank(g, 'discipline');
export const projectMult = (g) => 1 + 0.06 * rank(g, 'business');
/** Hawk eye: is this worker about to slack (tired)? */
export const aboutToSlack = (g, e) => rank(g, 'hawk') > 0 && e.state === 'work' && e.boost <= 0 && e.energy < 30;

