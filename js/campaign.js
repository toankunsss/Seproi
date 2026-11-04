// Campaign ("Chiến dịch"): hand-made levels, each one special work day with its own office,
// rules and three goals (one star per goal reached). Levels are played on a throw-away copy of
// the game: main.js keeps the real company in campaignRun.main and saves only that, so nothing
// a level does touches the player's company. Stars and their 💎 rewards are written back to the
// real company when the level ends.
//
// Level fields:
//   setup  — staff (count), whip / coffee / assistant / office levels, money, stress, project
//   rules  — dayLength (s), slack (x slacking), slackKind (favourite slack), drain (x tiredness),
//            wrongMult (x wrong-whip fine), blackout (lights flicker), visits [{ at, kind }]
//   goals  — three [type, n] pairs: catches, kpi, wrong (≤ n), combo, revenue, noStrike,
//            project, kind:<slack>, visitOk
import { newGame, makeEmployee } from './state.js';
import { cvFromPool, makeCandidate } from './cv.js';
import * as projects from './projects.js';
import { addGems } from './achievements.js';

export const CHAPTERS = [
  { id: 1, name: 'Khởi nghiệp', gems: 5 },
  { id: 2, name: 'Mở rộng', gems: 8 },
  { id: 3, name: 'Đế chế', gems: 12 },
];

const S1 = { staff: 3, whip: 1, coffee: -1, assistant: -1, office: 0 };
const S2 = { staff: 6, whip: 2, coffee: 0, assistant: 0, office: 1 };
const S3 = { staff: 8, whip: 3, coffee: 2, assistant: 1, office: 2 };

export const LEVELS = [
  // Chapter 1 — the basics
  { id: '1-1', ch: 1, name: 'Ngày đầu làm sếp', brief: 'Làm quen: bắt kẻ lười, giữ KPI, đừng quất oan.',
    setup: S1, rules: { dayLength: 90 }, goals: [['catches', 12], ['kpi', 70], ['wrong', 0]] },
  { id: '1-2', ch: 1, name: 'Giờ cao điểm game', brief: 'Giải đấu game online đang diễn ra. Cả phòng ngứa tay!',
    setup: S1, rules: { dayLength: 90, slack: 1.6, slackKind: 'game' }, goals: [['catches', 20], ['kind:game', 12], ['combo', 4]] },
  { id: '1-3', ch: 1, name: 'Đừng quất oan', brief: 'Công đoàn đang theo dõi: quất oan bị phạt gấp 3.',
    setup: S1, rules: { dayLength: 90, wrongMult: 3, slack: 1.2 }, goals: [['wrong', 0], ['catches', 15], ['kpi', 75]] },
  { id: '1-4', ch: 1, name: 'Cà phê cứu nguy', brief: 'Cả phòng thức khuya xem bóng đá. Ai cũng buồn ngủ.',
    setup: { ...S1, coffee: 0 }, rules: { dayLength: 100, drain: 2, slackKind: 'sleep' }, goals: [['kpi', 65], ['kind:sleep', 8], ['catches', 18]] },
  { id: '1-5', ch: 1, name: 'Hợp đồng đầu tiên', brief: 'Khách hàng lớn đầu tiên! Xong dự án trước 18:00.',
    setup: { ...S1, project: 0.55 }, rules: { dayLength: 110 }, goals: [['project', 1], ['kpi', 75], ['wrong', 1]] },
  // Chapter 2 — a bigger office, harder days
  { id: '2-1', ch: 2, name: 'Thanh tra ghé thăm', brief: 'Thanh tra lao động đến lúc 11 giờ. Chỉ quất khi họ không nhìn!',
    setup: S2, rules: { dayLength: 100, visits: [{ at: 25, kind: 'labour' }] }, goals: [['visitOk', 1], ['catches', 25], ['kpi', 70]] },
  { id: '2-2', ch: 2, name: 'Mất điện', brief: 'Toà nhà mất điện, chỉ thấy rõ khi đèn chập chờn loé lên.',
    setup: S2, rules: { dayLength: 100, blackout: true }, goals: [['catches', 18], ['kpi', 60], ['wrong', 1]] },
  { id: '2-3', ch: 2, name: 'Thứ Hai uể oải', brief: 'Đầu tuần, ai cũng lười gấp đôi.',
    setup: S2, rules: { dayLength: 100, slack: 2 }, goals: [['kpi', 60], ['catches', 32], ['combo', 6]] },
  { id: '2-4', ch: 2, name: 'Ngân sách eo hẹp', brief: 'Trợ lý nghỉ phép, chỉ còn Sếp tự quản lý.',
    setup: { ...S2, assistant: -1, coffee: -1 }, rules: { dayLength: 100, slack: 1.3 }, goals: [['catches', 28], ['noStrike', 1], ['revenue', 2500]] },
  { id: '2-5', ch: 2, name: 'Deadline dí sát', brief: 'Dự án khó, hạn chót cuối ngày. Mọi người phải làm hết sức.',
    setup: { ...S2, project: 0.75 }, rules: { dayLength: 120, slack: 1.2 }, goals: [['project', 1], ['kpi', 75], ['wrong', 0]] },
  // Chapter 3 — the empire
  { id: '3-1', ch: 3, name: 'Bão crypto', brief: 'Thị trường coin biến động. Cả công ty dán mắt vào biểu đồ.',
    setup: S3, rules: { dayLength: 100, slack: 1.8, slackKind: 'crypto' }, goals: [['catches', 40], ['kind:crypto', 22], ['combo', 8]] },
  { id: '3-2', ch: 3, name: 'Thanh tra kép', brief: 'Thanh tra thuế buổi sáng, thanh tra lao động buổi chiều.',
    setup: S3, rules: { dayLength: 120, visits: [{ at: 18, kind: 'tax' }, { at: 65, kind: 'labour' }] }, goals: [['visitOk', 2], ['kpi', 75], ['catches', 35]] },
  { id: '3-3', ch: 3, name: 'Mất điện toàn toà nhà', brief: 'Tối om, lại thêm nhân viên lười hơn thường lệ.',
    setup: S3, rules: { dayLength: 100, blackout: true, slack: 1.5 }, goals: [['catches', 30], ['kpi', 60], ['wrong', 2]] },
  { id: '3-4', ch: 3, name: 'Đình công rình rập', brief: 'Cả phòng đang căng thẳng sẵn. Quất khéo kẻo cả phòng đình công.',
    setup: { ...S3, stress: 70 }, rules: { dayLength: 100, slack: 1.3 }, goals: [['noStrike', 1], ['kpi', 65], ['catches', 30]] },
  { id: '3-5', ch: 3, name: 'Sếp tổng đến thăm', brief: 'Trận cuối: dự án lớn, thanh tra lao động và một ngày cực lười.',
    setup: { ...S3, project: 0.8 }, rules: { dayLength: 130, slack: 1.6, visits: [{ at: 40, kind: 'labour' }] }, goals: [['project', 1], ['visitOk', 1], ['kpi', 70]] },
];

/** Vietnamese source text for a goal (translated by the UI). */
export function goalText(type, n) {
  if (type.startsWith('kind:')) return { s: { game: 'Bắt {n} người chơi game', toptop: 'Bắt {n} người lướt Tóp Tóp', sleep: 'Đánh thức {n} người ngủ gật', crypto: 'Bắt {n} người xem crypto' }[type.slice(5)], n };
  return {
    s: {
      catches: 'Bắt quả tang {n} kẻ lười', kpi: 'KPI trung bình ≥ {n}%', wrong: n ? 'Quất oan tối đa {n} lần' : 'Không quất oan lần nào',
      combo: 'Đạt combo x{n}', revenue: 'Doanh thu ≥ {n} đ', noStrike: 'Không ai đình công', project: 'Hoàn thành dự án',
      visitOk: n > 1 ? 'Qua cả {n} đợt thanh tra' : 'Qua đợt thanh tra không bị phạt',
    }[type], n,
  };
}

// --- progress ------------------------------------------------------------------------------
/** Current value of a goal and whether it is met right now. `final` = evaluated at clock-out. */
export function goalState(g, run, [type, n], final = false) {
  const day = g.today;
  const kpi = Math.round((day.kpiN ? day.kpiSum / day.kpiN : g.kpi) * 100);
  let v, ok;
  switch (true) {
    case type === 'catches': v = day.catches; ok = v >= n; break;
    case type === 'kpi': v = kpi; ok = v >= n; break;
    case type === 'wrong': v = day.wrong; ok = v <= n; break;
    case type === 'combo': v = day.bestCombo; ok = v >= n; break;
    case type === 'revenue': v = Math.floor(day.revenue); ok = v >= n; break;
    case type === 'noStrike': v = g.records.strikes; ok = v === 0; break;
    case type === 'project': v = g.projects.done; ok = v >= 1; break;
    case type === 'visitOk': v = run.visitsOk; ok = v >= n && run.visitsFail === 0; break;
    case type.startsWith('kind:'): v = g.records.caught[type.slice(5)] || 0; ok = v >= n; break;
    default: v = 0; ok = false;
  }
  // "keep it clean" goals are only certain once the day is over
  const pending = !final && (type === 'wrong' || type === 'noStrike' || type === 'kpi') && ok;
  return { v, ok, pending };
}

export function starsFor(g, run) {
  const level = LEVELS.find((l) => l.id === run.id);
  return level.goals.map((goal) => goalState(g, run, goal, true).ok);
}

// --- unlocking ------------------------------------------------------------------------------
export const bestStars = (main, id) => (main.campaign && main.campaign.stars[id]) || 0;
export const totalStars = (main) => LEVELS.reduce((s, l) => s + bestStars(main, l.id), 0);
/** A level opens when the one before it has at least 1 star. */
export function unlocked(main, id) {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i <= 0 || bestStars(main, LEVELS[i - 1].id) > 0;
}

// --- running a level --------------------------------------------------------------------------
/** Build the level's game state (a fresh game with the level setup). */
export function levelState(level) {
  const s = level.setup;
  const g = newGame();
  g.tutorial = 99;
  g.mode = 'office';
  g.officeLevel = s.office;
  g.rooms[0].level = s.office; // levels are played in a single room
  g.whipLevel = s.whip;
  g.coffeeLevel = s.coffee;
  g.assistantLevel = s.assistant;
  g.money = s.money || 0;
  g.day = 1 + (level.ch - 1) * 6; // a bit of day multiplier in later chapters
  g.staff = Array.from({ length: s.staff }, (_, i) => makeEmployee(i, i < 3 ? cvFromPool(i) : makeCandidate(g)));
  for (const e of g.staff) { e.energy = 100; if (s.stress) e.stress = s.stress; }
  g.mods = { ...level.rules };
  g.candidates = [];
  const room = g.rooms[0];
  room.offers = []; room.offersDay = g.day;
  if (s.project) {
    // a project sized for this team and this (shorter) day
    const p = projects.makeOffer(g, 0);
    const scale = s.project * (g.mods.dayLength || 150) / 150 / (p.days * 0.55);
    for (const r in p.req) p.req[r] = Math.max(20, Math.round(p.req[r] * scale / 5) * 5);
    room.offers = [p];
    projects.acceptOffer(g, 0, 0);
    room.project.deadline = g.day;
  }
  return g;
}

/** At clock-out: write stars and 💎 for newly earned stars into the real company. */
export function settle(main, run, stars) {
  const level = LEVELS.find((l) => l.id === run.id);
  const count = stars.filter(Boolean).length;
  if (!main.campaign) main.campaign = { stars: {}, plays: 0 };
  const before = main.campaign.stars[run.id] || 0;
  const gained = Math.max(0, count - before);
  const gems = gained * CHAPTERS.find((c) => c.id === level.ch).gems;
  if (count > before) main.campaign.stars[run.id] = count;
  main.campaign.plays = (main.campaign.plays || 0) + 1;
  if (gems) addGems(main, gems);
  return { count, gained, gems, best: Math.max(before, count) };
}

export const nextLevel = (id) => LEVELS[LEVELS.findIndex((l) => l.id === id) + 1] || null;
