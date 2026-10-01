// Game data & tuning. Content lives here so balancing never touches the engine.

// `salary` = monthly base pay for a Junior in that role (paid on PAYDAY each month).
export const ROLES = {
  dev:  { label: 'Lập trình',  income: 3.0, salary: 3000 },
  acc:  { label: 'Kế toán',    income: 2.2, salary: 2400 },
  des:  { label: 'Thiết kế',   income: 2.6, salary: 2700 },
  mkt:  { label: 'Marketing',  income: 2.8, salary: 2600 },
  sale: { label: 'Kinh doanh', income: 3.2, salary: 2800 },
};
export const ROLE_KEYS = Object.keys(ROLES);

// Seniority: multiplies income and salary.
export const GRADES = {
  intern: { label: 'Thực tập',    prod: 0.7,  pay: 0.45, years: [0, 0] },
  junior: { label: 'Junior',      prod: 1.0,  pay: 1.0,  years: [1, 2] },
  senior: { label: 'Senior',      prod: 1.35, pay: 1.7,  years: [3, 7] },
  lead:   { label: 'Trưởng nhóm', prod: 1.7,  pay: 2.6,  years: [6, 12] },
};
export const GRADE_KEYS = Object.keys(GRADES);

export const PAYDAY = 15;        // day of the month salaries are paid
export const HIRE_FEE = 0.5;     // one-off recruiting fee = this × monthly salary
export const CV_BATCH = 4;       // CVs per job posting

// Punishment tools. Each has its own upgrade track; `stress` = stress added per hit,
// `chain` = extra slackers a taser arc jumps to.
export const BATONS = [
  { name: 'Gậy Tre',            cost: 400,   bonus: 10,  boost: 9,  radius: 2, stress: 18, color: '#c9a05a', grip: '#6e4428' },
  { name: 'Gậy Gỗ Lim',         cost: 2000,  bonus: 45,  boost: 12, radius: 3, stress: 18, color: '#7a3f1c', grip: '#2a160c' },
  { name: 'Gậy Bóng Chày Thép', cost: 9000,  bonus: 160, boost: 16, radius: 4, stress: 20, color: '#c8ccd8', grip: '#e0404a' },
];
export const TASERS = [
  { name: 'Bút Chích Điện',  cost: 800,   bonus: 8,   boost: 7,  radius: 8,  stress: 15, chain: 1 },
  { name: 'Dùi Cui Điện',    cost: 4000,  bonus: 40,  boost: 10, radius: 10, stress: 15, chain: 2 },
  { name: 'Súng Điện Tesla', cost: 15000, bonus: 120, boost: 13, radius: 14, stress: 16, chain: 3 },
];

export const SLACKS = {
  game:   { label: 'Chơi game',      excuse: 'Đang combo mà sếp!' },
  toptop: { label: 'Lướt Tóp Tóp',   excuse: 'Em xem tí trend thôi...' },
  sleep:  { label: 'Ngủ gật',        excuse: 'Em... em đang nghĩ giải pháp!' },
  crypto: { label: 'Xem sàn crypto', excuse: 'Coin em đang x10 sếp ạ!' },
};
export const SLACK_KINDS = Object.keys(SLACKS);

// The founding team, there on day one. Everyone after them is hired from generated CVs.
export const STAFF_POOL = [
  { name: 'Nguyễn Văn Tuấn', short: 'Tuấn', role: 'dev', grade: 'junior', salary: 3000, skin: '#f1c7a0', hair: '#2b1d14', shirt: '#3d6fd6', style: 'short' },
  { name: 'Trần Thị Linh',   short: 'Linh', role: 'acc', grade: 'junior', salary: 2400, skin: '#f5d0b0', hair: '#1a1210', shirt: '#e0607e', style: 'long' },
  { name: 'Lê Đức Hùng',     short: 'Hùng', role: 'des', grade: 'junior', salary: 2700, skin: '#d9a57a', hair: '#6b3a1e', shirt: '#46b37a', style: 'spiky' },
];
export const STARTING_STAFF = STAFF_POOL.length;
// Offices can be bought as soon as the company fund covers the price.
// These three levels grow the first room; after that, whole new rooms open next to it.
export const OFFICE_LEVELS = [
  { name: 'Phòng khởi nghiệp', capacity: 4, cost: 0,    floor: [3, 9] },
  { name: 'Văn phòng mở rộng', capacity: 6, cost: 1500, floor: [1, 11] },
  { name: 'Trụ sở Sếp Roi',    capacity: 8, cost: 6500, floor: [0, 12] },
];

// Extra rooms, each 12 tiles wide, joined side by side along the back wall.
// `carpet` = two floor tones, `wall` = back-wall tone, `aisle` = walkway tones.
export const ROOM_W = 12;
export const DESKS_PER_ROOM = 8;
export const ROOMS = [
  { name: 'Phòng chính',      cost: 0,      carpet: ['#3f3a5c', '#46406a'], aisle: ['#8a7a66', '#96866f'], wall: '#574d7d' },
  { name: 'Phòng Sáng tạo',   cost: 25000,  carpet: ['#2f4a58', '#365565'], aisle: ['#7d8a70', '#88967a'], wall: '#3f5f72' },
  { name: 'Phòng Kinh doanh', cost: 80000,  carpet: ['#33503a', '#3a5c42'], aisle: ['#8e7f5c', '#9a8a64'], wall: '#456b4c' },
  { name: 'Phòng Họp lớn',    cost: 200000, carpet: ['#5a3434', '#663c3c'], aisle: ['#8a7466', '#967e6f'], wall: '#7a4a4a' },
  { name: 'Phòng Giám đốc',   cost: 500000, carpet: ['#5c4a26', '#6a552c'], aisle: ['#a08a5a', '#ad9664'], wall: '#7d6a3a' },
];
export const MAX_STAFF = DESKS_PER_ROOM * ROOMS.length;

/** Desks the company can seat right now. */
export const capacityOf = (g) => OFFICE_LEVELS[g.officeLevel].capacity + DESKS_PER_ROOM * ((g.rooms || 1) - 1);
/** Usable floor along gx for desks: the first room's bought part, or every bought room. */
export const floorOf = (g) => (g.rooms || 1) > 1 ? [0, ROOM_W * g.rooms] : OFFICE_LEVELS[g.officeLevel].floor;
/** The next room that can be bought (needs the first room fully upgraded), or null. */
export const nextRoom = (g) => g.officeLevel >= OFFICE_LEVELS.length - 1 ? ROOMS[g.rooms || 1] || null : null;

// Furniture. `pos` = default floor spot (grid), `box` = click/drag bounds around its
// anchor in screen pixels, `depth` = how far in front of the anchor it sorts,
// `mount: 'wall'` = hangs on the left wall (only slides along it), `multi` = can buy several.
export const DECOR_ITEMS = [
  { id: 'plant',    name: 'Chậu cây',            desc: 'Xanh mát, mua bao nhiêu cũng được.', cost: 150,  level: 0, multi: true, pos: [6, 8.3],    box: [-10, -27, 10, 6],   depth: 0 },
  { id: 'rug',      name: 'Thảm KPI',            desc: 'Thảm đỏ chạy giữa văn phòng.',        cost: 300,  level: 0, flat: true,  pos: [6, 4.25],   box: [-42, -11, 42, 31],  depth: 0 },
  { id: 'cooler',   name: 'Bình nước nóng lạnh', desc: 'Nơi tụ tập buôn chuyện chính thức.',  cost: 450,  level: 0,              pos: [2.4, 8.4],  box: [-9, -32, 9, 5],     depth: 0 },
  { id: 'lamp',     name: 'Đèn cây',             desc: 'Một góc làm việc bớt u ám.',          cost: 550,  level: 0,              pos: [10.8, 1.1], box: [-8, -39, 8, 1],     depth: 0 },
  { id: 'printer',  name: 'Máy in kẹt giấy',     desc: 'In được 3 tờ thì kẹt 1 tờ.',          cost: 700,  level: 0,              pos: [8.6, 0.6],  box: [-16, -20, 16, 8],   depth: 0.3 },
  { id: 'sofa',     name: 'Sofa tiếp khách',     desc: 'Chỗ ngồi sang hơn ghế nhựa.',         cost: 900,  level: 1,              pos: [1.25, 5.2], box: [-22, -26, 36, 26],  depth: 1.6 },
  { id: 'shelf',    name: 'Tủ sách chuyên môn',  desc: 'Sách nhiều, đọc bao nhiêu chưa rõ.',  cost: 1250, level: 1,              pos: [0.4, 1.1],  box: [-6, -42, 24, 1],    depth: 0 },
  { id: 'vending',  name: 'Máy bán nước',        desc: 'Nạp đường cho cả đội.',               cost: 1600, level: 1,              pos: [11.2, 4.4], box: [-16, -46, 16, 8],   depth: 0.3 },
  { id: 'aquarium', name: 'Bể cá thư giãn',      desc: 'Cá bơi, KPI vẫn chạy.',               cost: 2400, level: 2,              pos: [10.65, 7.45], box: [-17, -31, 17, 9], depth: 0 },
  { id: 'trophy',   name: 'Cúp Sếp xuất sắc',    desc: 'Treo tường, chỉ trượt dọc tường trái.', cost: 4200, level: 2, mount: 'wall', pos: [0, 7.1],   box: [-10, -61, 12, -38], depth: -5 },
];
// Plants the office starts with (they used to be part of the room art).
export const STARTING_DECOR = [{ kind: 'plant', gx: 11.2, gy: 8.2 }, { kind: 'plant', gx: 0.8, gy: 8.3 }];

// Coffee machine default spot (movable like furniture).
export const COFFEE_POS = [0.15, 1.9]; // against the left wall, next to the bookshelf spot

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

// --- CV generator pools -------------------------------------------------------------------
export const CV_POOL = {
  family: ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'],
  middle: ['Văn', 'Thị', 'Minh', 'Đức', 'Ngọc', 'Thanh', 'Hoài', 'Gia', 'Quốc', 'Bảo', 'Khánh', 'Thu', 'Anh', 'Hữu', 'Phương'],
  given: ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hiếu', 'Hương', 'Khoa', 'Lan', 'Long', 'Mai', 'Minh', 'My',
    'Nam', 'Ngân', 'Phong', 'Phúc', 'Quân', 'Quỳnh', 'Sơn', 'Tâm', 'Thảo', 'Trang', 'Trí', 'Tú', 'Vy', 'Yến', 'Linh', 'Hoa', 'Đức', 'Kiên', 'Nhung'],
  school: ['ĐH Bách Khoa', 'ĐH Kinh tế Quốc dân', 'ĐH FPT', 'ĐH Kiến trúc', 'Học viện Tài chính', 'ĐH Mỹ thuật Công nghiệp',
    'Học viện Bưu chính Viễn thông', 'ĐH Ngoại thương', 'Trường Đời', 'Tự học qua YouTube', 'Khoá online 7 ngày'],
  company: ['Công ty TNHH Nằm Im', 'Startup Bay Màu', 'Tập đoàn Họp Hoài', 'Agency Deadline Dí', 'CTCP Ngủ Trưa', 'Ngân hàng Lãi Suất Cao',
    'Freelance tự do', 'Shop online của mẹ', 'Công ty Outsource Thâu Đêm', 'Chưa đi làm ở đâu', 'Quán trà sữa đầu ngõ'],
  skills: {
    dev: ['JavaScript', 'Python', 'Fix bug lúc 2h sáng', 'Copy Stack Overflow', 'Git (thỉnh thoảng)', 'Viết code không comment', 'Docker', 'SQL'],
    acc: ['Excel nâng cao', 'Hoá đơn VAT', 'Cân sổ cuối tháng', 'Tính lương thần tốc', 'Pivot table', 'Báo cáo thuế', 'Đếm tiền bằng mắt'],
    des: ['Photoshop', 'Figma', 'Chọn font mất 3 tiếng', 'Vẽ logo', 'Sửa "cho to lên"', 'Illustrator', 'Dựng video ngắn'],
    mkt: ['Viết caption', 'Chạy quảng cáo', 'Bắt trend', 'Livestream', 'SEO', 'Đặt hashtag', 'Làm meme'],
    sale: ['Chốt đơn', 'Gọi 100 cuộc/ngày', 'Nói chuyện ngọt', 'Đàm phán giá', 'Nhớ tên khách', 'Uống bia tiếp khách', 'CRM'],
  },
  hobby: ['Chơi game', 'Lướt Tóp Tóp', 'Ngủ', 'Đầu tư coin', 'Đọc sách', 'Chạy bộ', 'Karaoke', 'Nuôi mèo', 'Nấu ăn', 'Xem phim bộ'],
  quote: [
    'Em sẵn sàng OT không lương ạ!', 'Em làm việc tốt nhất sau 10 giờ đêm.', 'Em chỉ lướt điện thoại lúc nghỉ thôi ạ.',
    'Deadline là động lực của em.', 'Em không ngại khó, chỉ ngại dậy sớm.', 'Em muốn gắn bó lâu dài (ít nhất 3 tháng).',
    'Lương không quan trọng, nhưng phải đủ cao.', 'Em từng làm 3 dự án cùng lúc, cả 3 đều trễ.', 'Em là người chịu được áp lực roi vọt.',
  ],
};

// Personality traits. One positive and one negative per CV; they change how the person plays.
//   slack × slack chance · stress × stress taken · prod × income · fav = preferred way to slack
export const TRAITS = {
  diligent: { label: 'Chăm chỉ',          good: true,  slack: 0.7 },
  tough:    { label: 'Chịu áp lực tốt',   good: true,  stress: 0.65 },
  fast:     { label: 'Năng suất cao',     good: true,  prod: 1.15 },
  loyal:    { label: 'Trung thành',       good: true,  stress: 0.85, slack: 0.9 },
  sleepy:   { label: 'Hay ngủ gật',       good: false, slack: 1.3, fav: 'sleep' },
  gamer:    { label: 'Nghiện game',       good: false, slack: 1.25, fav: 'game' },
  trader:   { label: 'Trader nghiệp dư',  good: false, slack: 1.2, fav: 'crypto' },
  scroller: { label: 'Thánh lướt Tóp Tóp', good: false, slack: 1.25, fav: 'toptop' },
  fragile:  { label: 'Dễ tổn thương',     good: false, stress: 1.4 },
};

export const LOOKS = {
  skin: ['#f5d0b0', '#f1c7a0', '#e0ac80', '#d9a57a', '#c98e62', '#a8724a'],
  hair: ['#1a1210', '#2b1d14', '#40281a', '#6b3a1e', '#c9643a', '#e8c35a', '#8a8a96', '#3a2a5a'],
  shirt: ['#3d6fd6', '#e0607e', '#46b37a', '#9a64d6', '#e3a33b', '#34a4c4', '#d65a3d', '#5a6ee0', '#2f2f3a', '#f0f0f0'],
  style: ['short', 'long', 'bun', 'spiky', 'bald'],
};

export const RANKS = [
  { min: 0,  title: 'Sếp Hiền Như Bụt' },
  { min: 40, title: 'Sếp Khó Tính' },
  { min: 60, title: 'Sếp Nghiêm Khắc' },
  { min: 75, title: 'Sếp Ác Quỷ' },
  { min: 90, title: 'Chúa Tể KPI' },
];
