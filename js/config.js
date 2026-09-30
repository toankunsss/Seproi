// Game data & tuning. Content lives here so balancing never touches the engine.

export const ROLES = {
  dev: { label: 'Lập trình', income: 3.0, screen: 'code' },
  acc: { label: 'Kế toán', income: 2.2, screen: 'sheet' },
  des: { label: 'Thiết kế', income: 2.6, screen: 'design' },
};

export const SLACKS = {
  game:   { label: 'Chơi game',      excuse: 'Đang combo mà sếp!' },
  toptop: { label: 'Lướt Tóp Tóp',   excuse: 'Em xem tí trend thôi...' },
  sleep:  { label: 'Ngủ gật',        excuse: 'Em... em đang nghĩ giải pháp!' },
  crypto: { label: 'Xem sàn crypto', excuse: 'Coin em đang x10 sếp ạ!' },
};
export const SLACK_KINDS = Object.keys(SLACKS);

// Hiring order. The first STARTING_STAFF are there on day one.
export const STAFF_POOL = [
  { name: 'Tuấn',  role: 'dev', skin: '#f1c7a0', hair: '#2b1d14', shirt: '#3d6fd6', style: 'short' },
  { name: 'Linh',  role: 'acc', skin: '#f5d0b0', hair: '#1a1210', shirt: '#e0607e', style: 'long' },
  { name: 'Hùng',  role: 'des', skin: '#d9a57a', hair: '#6b3a1e', shirt: '#46b37a', style: 'spiky' },
  { name: 'Mai',   role: 'dev', skin: '#f1c7a0', hair: '#c9643a', shirt: '#9a64d6', style: 'bun' },
  { name: 'Nam',   role: 'acc', skin: '#c98e62', hair: '#141014', shirt: '#e3a33b', style: 'short' },
  { name: 'Trang', role: 'des', skin: '#f5d0b0', hair: '#40281a', shirt: '#34a4c4', style: 'long' },
  { name: 'Đức',   role: 'dev', skin: '#e0ac80', hair: '#8a8a96', shirt: '#d65a3d', style: 'bald' },
  { name: 'Hoa',   role: 'acc', skin: '#f1c7a0', hair: '#e8c35a', shirt: '#5a6ee0', style: 'bun' },
];
export const STARTING_STAFF = 3;
export const MAX_STAFF = STAFF_POOL.length;
export const hireCost = (count) => Math.round(200 * Math.pow(1.75, count - STARTING_STAFF));

// Office growth is driven by total revenue, then paid from the current company fund.
export const OFFICE_LEVELS = [
  { name: 'Phòng khởi nghiệp', capacity: 4, unlockRevenue: 0, cost: 0 },
  { name: 'Văn phòng mở rộng', capacity: 6, unlockRevenue: 1500, cost: 1200 },
  { name: 'Trụ sở Sếp Roi', capacity: 8, unlockRevenue: 7500, cost: 6000 },
];

export const DECOR_ITEMS = [
  { id: 'rug', name: 'Thảm KPI', desc: 'Thảm đỏ chạy giữa văn phòng.', cost: 300, level: 0 },
  { id: 'lamp', name: 'Đèn cây', desc: 'Một góc làm việc bớt u ám.', cost: 550, level: 0 },
  { id: 'sofa', name: 'Sofa tiếp khách', desc: 'Chỗ ngồi sang hơn ghế nhựa.', cost: 900, level: 1 },
  { id: 'shelf', name: 'Tủ sách chuyên môn', desc: 'Sách nhiều, đọc bao nhiêu chưa rõ.', cost: 1250, level: 1 },
  { id: 'aquarium', name: 'Bể cá thư giãn', desc: 'Cá bơi, KPI vẫn chạy.', cost: 2400, level: 2 },
  { id: 'trophy', name: 'Cúp Sếp xuất sắc', desc: 'Biểu tượng quyền lực tối thượng.', cost: 4200, level: 2 },
];

export const WHIPS = [
  { name: 'Roi Mây',      cost: 0,     bonus: 6,   boost: 6,  radius: 4,  rope: '#9a6a3a', tip: '#c89a5a', fx: 'wood' },
  { name: 'Roi Da Bò',    cost: 250,   bonus: 14,  boost: 8,  radius: 6,  rope: '#6e3b1f', tip: '#a8582c', fx: 'wood' },
  { name: 'Roi Gai',      cost: 1500,  bonus: 35,  boost: 10, radius: 8,  rope: '#4a4a52', tip: '#c0c0cc', fx: 'metal' },
  { name: 'Roi Điện',     cost: 6000,  bonus: 90,  boost: 12, radius: 10, rope: '#2a3a6a', tip: '#8fe8ff', fx: 'elec' },
  { name: 'Roi Rồng Lửa', cost: 20000, bonus: 240, boost: 15, radius: 13, rope: '#6a1a10', tip: '#ffb030', fx: 'fire' },
];

export const COFFEE = [
  { cost: 300,  cooldown: 40, regen: 0.25 },
  { cost: 1000, cooldown: 30, regen: 0.45 },
  { cost: 3000, cooldown: 22, regen: 0.65 },
  { cost: 8000, cooldown: 15, regen: 0.9 },
];

export const ASSISTANT = [
  { cost: 600,   interval: 10 },
  { cost: 2500,  interval: 7 },
  { cost: 7000,  interval: 5 },
  { cost: 18000, interval: 3 },
];

export const TUNING = {
  dayLength: 150,          // seconds of real time for 9:00 → 18:00
  energyDrain: 1.5,        // per second while working
  slackBase: 0.035,        // slack chance / second at full energy
  slackTired: 0.13,        // extra chance / second at zero energy
  slackMin: 10, slackMax: 18, // how long a slack lasts if nobody catches it
  hurtTime: 0.7,
  boostMult: 1.6,
  stressCatch: 12,         // stress from a deserved whip
  stressWrong: 30,         // stress from whipping a working employee
  stressDecay: 0.6,
  strikeTime: 15,
  wrongPenalty: 25,        // money lost when whipping an innocent
  comboWindow: 2.5,
  kpiTau: 20,              // seconds for the KPI moving average
  dayMult: 0.12,           // income growth per day
};

export const RANKS = [
  { min: 0,  title: 'Sếp Hiền Như Bụt' },
  { min: 40, title: 'Sếp Khó Tính' },
  { min: 60, title: 'Sếp Nghiêm Khắc' },
  { min: 75, title: 'Sếp Ác Quỷ' },
  { min: 90, title: 'Chúa Tể KPI' },
];
