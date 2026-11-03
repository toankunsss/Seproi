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
  // new kinds, each caught differently (sim.js / view.js / portrait.js)
  snack: { label: 'Ăn vặt', excuse: 'Em nạp năng lượng để chạy deadline!' },
  call: { label: 'Gọi điện riêng', excuse: 'Mẹ em gọi sếp ạ, em cúp đây!', hits: 2 },        // needs two whips
  meeting: { label: 'Giả vờ họp', excuse: 'Em đang họp với đối tác mà sếp!', sneaky: true }, // bubble flickers
  toilet: { label: 'Trốn trong toilet', excuse: 'Em… em đau bụng thật mà!', hide: true },     // leaves the desk
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
export const hireCost = (count) => Math.round(300 * Math.pow(1.85, count - STARTING_STAFF));

// Office growth is driven by total revenue, then paid from the current company fund.
export const OFFICE_LEVELS = [
  { name: 'Phòng khởi nghiệp', capacity: 4, unlockRevenue: 0, cost: 0 },
  { name: 'Văn phòng mở rộng', capacity: 6, unlockRevenue: 9000, cost: 8000 },
  { name: 'Trụ sở Whip Boss', capacity: 8, unlockRevenue: 150000, cost: 120000 },
];

export const DECOR_ITEMS = [
  { id: 'rug', name: 'Thảm KPI', desc: 'Thảm đỏ chạy giữa văn phòng.', cost: 900, level: 0 },
  { id: 'lamp', name: 'Đèn cây', desc: 'Một góc làm việc bớt u ám.', cost: 2000, level: 0 },
  { id: 'sofa', name: 'Sofa tiếp khách', desc: 'Chỗ ngồi sang hơn ghế nhựa.', cost: 6000, level: 1 },
  { id: 'shelf', name: 'Tủ sách chuyên môn', desc: 'Sách nhiều, đọc bao nhiêu chưa rõ.', cost: 10000, level: 1 },
  { id: 'aquarium', name: 'Bể cá thư giãn', desc: 'Cá bơi, KPI vẫn chạy.', cost: 40000, level: 2 },
  { id: 'trophy', name: 'Cúp Sếp xuất sắc', desc: 'Biểu tượng quyền lực tối thượng.', cost: 90000, level: 2 },
];

export const WHIPS = [
  { name: 'Roi Mây',      cost: 0,     bonus: 6,   boost: 6,  radius: 4,  rope: '#9a6a3a', tip: '#c89a5a', fx: 'wood' },
  { name: 'Roi Da Bò',    cost: 500,   bonus: 14,  boost: 8,  radius: 6,  rope: '#6e3b1f', tip: '#a8582c', fx: 'wood' },
  { name: 'Roi Gai',      cost: 5000,  bonus: 35,  boost: 10, radius: 8,  rope: '#4a4a52', tip: '#c0c0cc', fx: 'metal' },
  { name: 'Roi Điện',     cost: 30000, bonus: 90,  boost: 12, radius: 10, rope: '#2a3a6a', tip: '#8fe8ff', fx: 'elec' },
  { name: 'Roi Rồng Lửa', cost: 150000, bonus: 240, boost: 15, radius: 13, rope: '#6a1a10', tip: '#ffb030', fx: 'fire' },
  // Premium (💎) whip: never sold for đ, unlocked by the "Roi Kim Cương" perk.
  { name: 'Roi Kim Cương', cost: Infinity, premium: true, bonus: 600, boost: 18, radius: 15, rope: '#4fb8e8', tip: '#e8fbff', fx: 'elec' },
];

export const COFFEE = [
  { cost: 500,   cooldown: 40, regen: 0.25 },
  { cost: 4000,  cooldown: 30, regen: 0.45 },
  { cost: 15000, cooldown: 22, regen: 0.65 },
  { cost: 50000, cooldown: 15, regen: 0.9 },
];

export const ASSISTANT = [
  { cost: 1500,  interval: 10 },
  { cost: 9000,  interval: 7 },
  { cost: 35000, interval: 5 },
  { cost: 100000, interval: 3 },
];

/** Length of the current work day: campaign levels can shorten it (g.mods.dayLength). */
export const dayLen = (g) => (g.mods && g.mods.dayLength) || TUNING.dayLength;

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
  comboCap: 4,             // catch reward multiplier tops out at x4 (combo 7+)
  adDayBonus: 0.5,         // end-of-day ad: +50% of the day's revenue without project money
  kpiTau: 20,              // seconds for the KPI moving average
  dayMult: 0.12,           // income growth per day
  touchSlop: 7,            // extra whip reach (buffer px) for fingers on touch screens
  awayCap: 300,            // max seconds of background time simulated on return
};

export const RANKS = [
  { min: 0,  title: 'Sếp Hiền Như Bụt' },
  { min: 40, title: 'Sếp Khó Tính' },
  { min: 60, title: 'Sếp Nghiêm Khắc' },
  { min: 75, title: 'Sếp Ác Quỷ' },
  { min: 90, title: 'Chúa Tể KPI' },
];

// --- Premium currency ---------------------------------------------------------------------
// Kim cương (💎): earned from achievements, projects and rewarded ads; spent on premium items.
export const GEMS_START = 10;

// Privacy policy (docs/privacy.html on GitHub Pages). Google Play requires a link in the app too.
export const PRIVACY_URL = 'https://toankunsss.github.io/Seproi/privacy.html';

// --- Recruitment (CV) -----------------------------------------------------------------------
// Every day a few candidates send in a CV. Traits are 1..5 stars and change the simulation:
//   skill → income & project work, lazy → how often they slack, grit → stress they take per whip.
export const CANDIDATES_PER_DAY = 3;
export const CV_NAMES = [
  'An', 'Bảo', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hân', 'Hiếu', 'Huy', 'Khang', 'Khánh', 'Lan', 'Long',
  'Minh', 'My', 'Nga', 'Ngọc', 'Nhi', 'Phát', 'Phúc', 'Quân', 'Quyên', 'Sơn', 'Tâm', 'Thảo', 'Thịnh', 'Thư',
  'Tú', 'Uyên', 'Vy', 'Yến',
];
export const CV_LOOKS = {
  skin: ['#f1c7a0', '#f5d0b0', '#d9a57a', '#c98e62', '#e0ac80'],
  hair: ['#2b1d14', '#1a1210', '#6b3a1e', '#c9643a', '#141014', '#40281a', '#8a8a96', '#e8c35a', '#5a3a8a'],
  shirt: ['#3d6fd6', '#e0607e', '#46b37a', '#9a64d6', '#e3a33b', '#34a4c4', '#d65a3d', '#5a6ee0', '#3a3a48'],
  style: ['short', 'long', 'spiky', 'bun', 'bald'],
};
// Hobby on the CV hints at how they slack (70% of their slacking is this kind).
export const CV_HOBBIES = {
  game: ['Leo rank game di động', 'Speedrun game cổ', 'Cày game online xuyên đêm'],
  toptop: ['Lướt Tóp Tóp bắt trend', 'Quay vlog dạo phố', 'Săn deal livestream'],
  sleep: ['Ngủ trưa 2 tiếng', 'Thiền (và ngủ quên)', 'Nằm dài nghe podcast'],
  crypto: ['Đầu tư coin "chắc thắng"', 'Đọc biểu đồ nến', 'Đào coin bằng máy công ty'],
  snack: ['Review đồ ăn vặt', 'Ăn bánh tráng trộn', 'Sưu tầm snack nước ngoài'],
  call: ['Buôn điện thoại hàng giờ', 'Tư vấn tình cảm qua điện thoại', 'Bán hàng online qua điện thoại'],
  meeting: ['Tham gia mọi cuộc họp', 'Viết biên bản họp', 'Đặt lịch họp'],
  toilet: ['Đọc truyện trong toilet', 'Chơi game trong toilet', 'Ngồi thiền ở nơi yên tĩnh'],
};
export const CV_LINES = {
  dev: ['Thành thạo Ctrl+C, Ctrl+V', 'Biết 7 ngôn ngữ lập trình, nói được 1', 'Sửa bug bằng cách tắt máy bật lại', 'Từng code xuyên Tết'],
  acc: ['Excel nhanh như chớp', 'Cân bảng lương trong 5 phút', 'Thuộc lòng luật thuế 2026', 'Không bao giờ lệch 1 đồng'],
  des: ['Kéo font chữ bằng cảm xúc', 'Làm logo trong 1 đêm', 'Bậc thầy màu pastel', 'Photoshop không cần chuột'],
};
export const CV_QUOTES = [
  'Em sẵn sàng làm thêm giờ (nếu có trà sữa).',
  'Điểm yếu của em là quá cầu toàn.',
  'Em muốn học hỏi môi trường chuyên nghiệp.',
  'Lương không quan trọng, quan trọng là lương cao.',
  'Em nghe nói sếp ở đây rất "nghiêm".',
  'Em có thể bắt đầu ngay hôm nay!',
];

// --- Projects (nghiệp vụ) -------------------------------------------------------------------
// Clients hand out contracts. Working staff add work points for their role; finish before the
// deadline (end of day N) for money + 💎. One active project at a time.
export const PROJECT_TYPES = [
  { name: 'Website bán hàng', roles: { dev: 1, des: 0.6 } },
  { name: 'Báo cáo thuế quý', roles: { acc: 1 } },
  { name: 'App giao đồ ăn', roles: { dev: 1, des: 0.5 } },
  { name: 'Bộ nhận diện thương hiệu', roles: { des: 1 } },
  { name: 'Phần mềm quản lý kho', roles: { dev: 0.8, acc: 0.7 } },
  { name: 'Chiến dịch quảng cáo Tết', roles: { des: 1, acc: 0.3 } },
  { name: 'Kiểm toán cuối năm', roles: { acc: 1 } },
  { name: 'Game di động', roles: { dev: 1, des: 0.8 } },
  { name: 'Hệ thống tính lương', roles: { dev: 0.6, acc: 1 } },
  { name: 'Landing page sự kiện', roles: { des: 1, dev: 0.4 } },
];
export const CLIENTS = [
  'Bánh mì Cô Ba', 'Tập đoàn Vạn Lời', 'Shop Thời Trang Hồng', 'Phở Gia Truyền', 'Startup Kỳ Lân',
  'Nhà sách Tri Thức', 'Trà sữa Mây', 'Xe ôm Siêu Tốc', 'Gym Cơ Bắp', 'Homestay Đà Lạt Mộng',
];
export const PROJECT_OFFERS = 3;
export const PROJECT_PENALTY = 0.4; // failing (late or cancelled) costs 40% of the contract value
export const WORK_RATE = 1; // work points per second per working employee (x skill, x boost)

// --- Premium items (💎) ------------------------------------------------------------------------
//   perk  — permanent, bought once
//   boost — consumable, buy as often as you like
export const PREMIUM_ITEMS = [
  { id: 'aiClock', kind: 'perk', gems: 250, name: 'Máy chấm công AI', desc: '+15% thu nhập vĩnh viễn.' },
  { id: 'massage', kind: 'perk', gems: 200, name: 'Ghế massage', desc: 'Áp lực của nhân viên giảm nhanh gấp đôi.' },
  { id: 'secretary', kind: 'perk', gems: 450, name: 'Thư ký riêng', desc: 'Trợ lý quất kẻ lười mỗi 2 giây.', needs: 'Cần Trợ lý Lv4' },
  { id: 'diamondWhip', kind: 'perk', gems: 999, name: 'Roi Kim Cương', desc: 'Thưởng bắt quả tang 600 đ, tầm quất rộng nhất.', needs: 'Cần Roi Rồng Lửa' },
  { id: 'hotBonus', kind: 'boost', gems: 30, name: 'Thưởng nóng', desc: 'x2 thu nhập trong 60 giây.' },
  { id: 'espresso', kind: 'boost', gems: 25, name: 'Cà phê thượng hạng', desc: 'Cả công ty hăng say 30 giây, hết sạch áp lực.' },
  { id: 'starCv', kind: 'boost', gems: 60, name: 'Săn đầu người', desc: 'Làm mới CV, chắc chắn có 1 ứng viên ngôi sao.' },
  { id: 'cash', kind: 'boost', gems: 80, name: 'Rút quỹ đầu tư', desc: 'Nhận ngay một nửa doanh thu của ngày tốt nhất.' },
];

// --- Rewarded ads ------------------------------------------------------------------------------
export const ADS = {
  gemsPerAd: 5,     // "Xem quảng cáo +5 💎"
  gemAdsPerDay: 6,  // daily cap for the gem reward
};

// --- Achievements --------------------------------------------------------------------------------
// stat(g) → current value; reaching `goal` lets the player claim `gems`.
export const ACHIEVEMENTS = [
  { id: 'catch10', name: 'Mắt diều hâu', desc: 'Bắt quả tang 10 lần', goal: 10, gems: 5, stat: (g) => g.records.catches },
  { id: 'catch100', name: 'Thanh tra lão luyện', desc: 'Bắt quả tang 100 lần', goal: 100, gems: 15, stat: (g) => g.records.catches },
  { id: 'catch1000', name: 'Bàn tay sắt', desc: 'Bắt quả tang 1.000 lần', goal: 1000, gems: 40, stat: (g) => g.records.catches },
  { id: 'combo5', name: 'Liên hoàn roi', desc: 'Đạt combo x5', goal: 5, gems: 5, stat: (g) => g.records.bestCombo },
  { id: 'combo12', name: 'Bão roi', desc: 'Đạt combo x12', goal: 12, gems: 20, stat: (g) => g.records.bestCombo },
  { id: 'day3', name: 'Trụ vững', desc: 'Điều hành công ty tới ngày 3', goal: 3, gems: 5, stat: (g) => g.day },
  { id: 'day10', name: 'Công ty có tiếng', desc: 'Điều hành công ty tới ngày 10', goal: 10, gems: 15, stat: (g) => g.day },
  { id: 'day30', name: 'Doanh nghiệp lâu năm', desc: 'Điều hành công ty tới ngày 30', goal: 30, gems: 40, stat: (g) => g.day },
  { id: 'staff6', name: 'Mở rộng nhân sự', desc: 'Có 6 nhân viên', goal: 6, gems: 10, stat: (g) => g.staff.length },
  { id: 'staff8', name: 'Full biên chế', desc: 'Có 8 nhân viên', goal: 8, gems: 20, stat: (g) => g.staff.length },
  { id: 'star', name: 'Săn nhân tài', desc: 'Tuyển 1 ứng viên ngôi sao', goal: 1, gems: 10, stat: (g) => g.records.starsHired },
  { id: 'office2', name: 'Chuyển nhà', desc: 'Mở Văn phòng mở rộng', goal: 1, gems: 10, stat: (g) => g.officeLevel },
  { id: 'office3', name: 'Trụ sở riêng', desc: 'Mở Trụ sở Whip Boss', goal: 2, gems: 20, stat: (g) => g.officeLevel },
  { id: 'whip5', name: 'Rồng lửa', desc: 'Sở hữu Roi Rồng Lửa', goal: 4, gems: 20, stat: (g) => g.whipLevel },
  { id: 'decor6', name: 'Văn phòng sang chảnh', desc: 'Mua đủ 6 món nội thất', goal: 6, gems: 15, stat: (g) => g.decor.length },
  { id: 'proj1', name: 'Hợp đồng đầu tiên', desc: 'Hoàn thành 1 dự án', goal: 1, gems: 5, stat: (g) => g.projects.done },
  { id: 'proj10', name: 'Đối tác tin cậy', desc: 'Hoàn thành 10 dự án', goal: 10, gems: 25, stat: (g) => g.projects.done },
  { id: 'proj30', name: 'Tập đoàn đa ngành', desc: 'Hoàn thành 30 dự án', goal: 30, gems: 50, stat: (g) => g.projects.done },
  { id: 'earn10k', name: 'Có lãi', desc: 'Tổng doanh thu 10.000 đ', goal: 1e4, gems: 5, stat: (g) => g.lifetimeEarnings },
  { id: 'earn100k', name: 'Đại gia', desc: 'Tổng doanh thu 100.000 đ', goal: 1e5, gems: 15, stat: (g) => g.lifetimeEarnings },
  { id: 'earn1m', name: 'Tỷ phú KPI', desc: 'Tổng doanh thu 1.000.000 đ', goal: 1e6, gems: 40, stat: (g) => g.lifetimeEarnings },
  { id: 'kpi95', name: 'Kỷ luật thép', desc: 'Kết thúc ngày với KPI ≥ 95%', goal: 95, gems: 10, stat: (g) => g.records.bestKpi },
  { id: 'fair', name: 'Sếp công tâm', desc: 'Một ngày bắt ≥ 15 lần mà không quất oan ai', goal: 1, gems: 15, stat: (g) => g.records.fairDays },
  { id: 'strike', name: 'Ác mộng công đoàn', desc: 'Lần đầu bị nhân viên đình công', goal: 1, gems: 5, stat: (g) => g.records.strikes },
  // --- 26 more (25–50) ---
  // catching
  { id: 'catch5000', name: 'Huyền thoại thanh tra', desc: 'Bắt quả tang 5.000 lần', goal: 5000, gems: 80, stat: (g) => g.records.catches },
  { id: 'combo20', name: 'Cuồng phong', desc: 'Đạt combo x20', goal: 20, gems: 40, stat: (g) => g.records.bestCombo },
  { id: 'gamer50', name: 'Game over', desc: 'Bắt 50 người đang chơi game', goal: 50, gems: 10, stat: (g) => g.records.caught.game },
  { id: 'toptop50', name: 'Hết trend', desc: 'Bắt 50 người đang lướt Tóp Tóp', goal: 50, gems: 10, stat: (g) => g.records.caught.toptop },
  { id: 'sleep50', name: 'Báo thức sống', desc: 'Bắt 50 người đang ngủ gật', goal: 50, gems: 10, stat: (g) => g.records.caught.sleep },
  { id: 'crypto50', name: 'Sập sàn', desc: 'Bắt 50 người đang xem coin', goal: 50, gems: 10, stat: (g) => g.records.caught.crypto },
  { id: 'assist100', name: 'Cánh tay phải', desc: 'Trợ lý tự quất 100 lần', goal: 100, gems: 15, stat: (g) => g.records.assistCatches },
  // running the company
  { id: 'day60', name: 'Kỳ cựu', desc: 'Điều hành công ty tới ngày 60', goal: 60, gems: 60, stat: (g) => g.day },
  { id: 'day100', name: 'Trăm ngày khởi nghiệp', desc: 'Điều hành công ty tới ngày 100', goal: 100, gems: 100, stat: (g) => g.day },
  { id: 'fair5', name: 'Sếp mẫu mực', desc: 'Có 5 ngày công tâm (bắt ≥ 15 lần, không quất oan)', goal: 5, gems: 30, stat: (g) => g.records.fairDays },
  { id: 'nick3', name: 'Sếp thân thiện', desc: 'Đặt biệt danh cho 3 nhân viên', goal: 3, gems: 5, stat: (g) => g.staff.filter((e) => e.nickname).length },
  { id: 'star3', name: 'Đội hình ngôi sao', desc: 'Tuyển 3 ứng viên ngôi sao', goal: 3, gems: 30, stat: (g) => g.records.starsHired },
  { id: 'strike10', name: 'Công đoàn nổi dậy', desc: 'Bị đình công 10 lần', goal: 10, gems: 5, stat: (g) => g.records.strikes },
  // money
  { id: 'earn10m', name: 'Tài phiệt', desc: 'Tổng doanh thu 10.000.000 đ', goal: 1e7, gems: 80, stat: (g) => g.lifetimeEarnings },
  { id: 'day5k', name: 'Ngày bội thu', desc: 'Một ngày đạt doanh thu 5.000 đ', goal: 5000, gems: 10, stat: (g) => (g.records.bestDays[0] || {}).revenue || 0 },
  { id: 'day20k', name: 'Ngày hoàng kim', desc: 'Một ngày đạt doanh thu 20.000 đ', goal: 20000, gems: 25, stat: (g) => (g.records.bestDays[0] || {}).revenue || 0 },
  { id: 'peak50k', name: 'Quỹ dày cộp', desc: 'Quỹ công ty có 50.000 đ cùng lúc', goal: 50000, gems: 15, stat: (g) => g.records.peakMoney },
  // upgrades
  { id: 'coffeeMax', name: 'Barista công nghiệp', desc: 'Nâng máy cà phê lên Lv4', goal: 3, gems: 15, stat: (g) => g.coffeeLevel },
  { id: 'assistMax', name: 'Trợ lý toàn năng', desc: 'Nâng Trợ lý lên Lv4', goal: 3, gems: 20, stat: (g) => g.assistantLevel },
  { id: 'coffee25', name: 'Nghiện cà phê', desc: 'Dùng Cà phê sốc 25 lần', goal: 25, gems: 10, stat: (g) => g.records.coffees },
  // projects
  { id: 'proj50', name: 'Đế chế kinh doanh', desc: 'Hoàn thành 50 dự án', goal: 50, gems: 80, stat: (g) => g.projects.done },
  { id: 'streak5', name: 'Uy tín vàng', desc: 'Hoàn thành 5 dự án liên tiếp không thất bại', goal: 5, gems: 20, stat: (g) => g.records.bestProjStreak },
  { id: 'bigProj', name: 'Hợp đồng khủng', desc: 'Hoàn thành một dự án 3 ngày', goal: 1, gems: 10, stat: (g) => g.records.bigProjects },
  // 💎
  { id: 'gems500', name: 'Thợ săn kim cương', desc: 'Kiếm tổng cộng 500 kim cương', goal: 500, gems: 25, stat: (g) => g.records.gemsEarned },
  { id: 'perks4', name: 'Hoàng gia', desc: 'Sở hữu cả 4 đặc quyền vĩnh viễn', goal: 4, gems: 50, stat: (g) => g.perks.length },
  { id: 'boost10', name: 'Chơi lớn', desc: 'Dùng 10 vật phẩm kim cương', goal: 10, gems: 15, stat: (g) => g.records.boostsUsed },
];

// --- Staff care: rewards & firing (staff.js) --------------------------------------------------
// Motivation (động lực, 0..100, 50 = neutral) scales slacking: 100 → x0.6, 0 → x1.4.
// It drifts back to a baseline (50 + 10 per salary level) at MOTIVATION.drift points/second.
// --- Collections (cosmetics.js) -------------------------------------------------------------
// Whip skins (look + crack sound), bought with 💎. They don't change the whip's power.
export const WHIP_SKINS = [
  { id: 'rau', name: 'Roi rau muống', gems: 40, rope: '#3a9a3a', tip: '#8ae06a', handle: '#2a6a2a', sound: 'soft' },
  { id: 'selfie', name: 'Gậy selfie', gems: 60, rope: '#2a2a32', tip: '#e8e8f0', handle: '#111111', sound: 'shutter' },
  { id: 'cable', name: 'Cáp sạc điện thoại', gems: 60, rope: '#f4f4f4', tip: '#c0c0cc', handle: '#ffffff', sound: 'beep' },
  { id: 'mop', name: 'Cây lau nhà', gems: 80, rope: '#d8d0a0', tip: '#f4f1ea', handle: '#6b4a2a', sound: 'splash' },
  { id: 'tet', name: 'Roi Tết', gems: 100, rope: '#d02030', tip: '#ffd34d', handle: '#ffd34d', sound: 'beep' },
  { id: 'neon', name: 'Roi neon', gems: 120, rope: '#ff3d7f', tip: '#2de2e6', handle: '#1d1826', sound: 'beep' },
];
// Office pets, bought with 💎. Cat: the office is happier (+motivation baseline).
// Dog: barks at anyone slacking for more than 3 s.
export const PETS = [
  { id: 'cat', name: 'Mèo văn phòng', gems: 80, desc: 'Nằm ườn trên vách ngăn. Cả phòng vui hơn: động lực nền +5.' },
  { id: 'dog', name: 'Chó canh cửa', gems: 100, desc: 'Sủa "GÂU!" khi có người lười quá 3 giây, Sếp đỡ bỏ sót.' },
];
// Staff album: 40 characters in 5 sets of 8. They turn up as applicants; hiring one adds their card.
export const ALBUM_SETS = [
  { id: 'game', name: 'Hội game thủ', fav: 'game' },
  { id: 'toptop', name: 'Hội sống ảo', fav: 'toptop' },
  { id: 'sleep', name: 'Hội ngủ gật', fav: 'sleep' },
  { id: 'crypto', name: 'Hội đầu tư', fav: 'crypto' },
  { id: 'special', name: 'Hội đặc biệt', fav: null },
];
export const ALBUM_REWARD = { setGems: 30, allGems: 100 };
export const ALBUM = [
  ['game', 'Khoa', 'Rank Thách Đấu nhưng deadline thì hạng Đồng.'],
  ['game', 'Duy', 'Bàn phím cơ kêu to nhất phòng, chủ yếu do bấm skill.'],
  ['game', 'Phong', 'Xin nghỉ ốm đúng ngày ra mắt game mới.'],
  ['game', 'Trâm', 'Gọi đồng nghiệp là "team", gọi sếp là "boss cuối".'],
  ['game', 'Hưng', 'Coi họp giao ban là màn hình chờ tải game.'],
  ['game', 'Nhung', 'Thuộc bản đồ game hơn sơ đồ văn phòng.'],
  ['game', 'Vinh', 'Đeo tai nghe 8 tiếng, chỉ tháo ra khi nghe "tăng lương".'],
  ['game', 'Quế', 'Từng gõ "GG" vào email gửi khách hàng.'],
  ['toptop', 'Ly', 'Quay video "một ngày đi làm" nhưng không làm gì.'],
  ['toptop', 'Bảo Anh', '100 nghìn người theo dõi, 0 file Excel hoàn thành.'],
  ['toptop', 'Kiên', 'Bắt trend nhanh hơn bắt deadline.'],
  ['toptop', 'Mỹ', 'Đổi ảnh đại diện 3 lần mỗi ngày.'],
  ['toptop', 'Toàn', 'Livestream bán hàng giờ nghỉ trưa, kéo dài 3 tiếng.'],
  ['toptop', 'Diệp', 'Chụp ảnh đồ ăn trước, ăn sau, làm việc thì để mai.'],
  ['toptop', 'Tùng', 'Lướt nhanh đến mức ngón cái có cơ bắp.'],
  ['toptop', 'Vy', 'Xem video "mẹo làm việc hiệu quả" 4 tiếng mỗi ngày.'],
  ['sleep', 'Đạt', 'Ngủ được ở mọi tư thế, kể cả khi đang gõ phím.'],
  ['sleep', 'Sương', 'Đặt 12 báo thức, tắt cả 12.'],
  ['sleep', 'Cường', 'Nói mớ ra cả mã nguồn.'],
  ['sleep', 'Thu', 'Cà phê không có tác dụng, chỉ có lương mới làm tỉnh.'],
  ['sleep', 'Hoà', 'Vào họp lúc 9 giờ, tỉnh dậy lúc 11 giờ, vẫn gật gù đồng ý.'],
  ['sleep', 'Lộc', 'Gối chữ U luôn trên bàn, gọi là "thiết bị văn phòng".'],
  ['sleep', 'Ngân', 'Ngáp một cái là cả phòng ngáp theo.'],
  ['sleep', 'Thắng', 'Mơ thấy deadline nên ngủ thêm để trốn.'],
  ['crypto', 'Tài', 'Mua đỉnh, bán đáy, đi làm để gỡ.'],
  ['crypto', 'Phú', 'Gọi lương tháng là "vốn mồi".'],
  ['crypto', 'Quý', 'Xem biểu đồ nến nhiều đến mức nhìn đâu cũng thấy nến.'],
  ['crypto', 'Bình', 'Đặt tên con mèo là Bitcoin.'],
  ['crypto', 'Như', 'Tin vào "coin x100" hơn tin vào KPI.'],
  ['crypto', 'Sang', 'Nghỉ việc 3 lần vì "sắp giàu", quay lại 3 lần.'],
  ['crypto', 'Lợi', 'Tính lãi kép cho cả tiền gửi xe.'],
  ['crypto', 'Vượng', 'Cài 7 ứng dụng sàn, không cài phần mềm công ty.'],
  ['special', 'Béo', 'Ngăn kéo bàn làm việc là một siêu thị mini.', 'snack'],
  ['special', 'Giòn', 'Ăn snack to đến mức họp online phải tắt mic.', 'snack'],
  ['special', 'Thoại', 'Gọi điện cho mẹ 5 lần mỗi ngày, mỗi lần 40 phút.', 'call'],
  ['special', 'Alo', 'Tai luôn dính điện thoại, kể cả khi điện thoại hết pin.', 'call'],
  ['special', 'Họp', 'Lịch kín họp, chưa ai thấy kết quả cuộc họp nào.', 'meeting'],
  ['special', 'Zoom', 'Tắt camera, bật ảnh nền "đang làm việc".', 'meeting'],
  ['special', 'Tiến', 'Đi vệ sinh 45 phút, về bảo "đang nghĩ giải pháp".', 'toilet'],
  ['special', 'Kín', 'Thuộc lòng lịch dọn toilet của cả toà nhà.', 'toilet'],
].map(([set, name, bio, fav], i) => ({ id: i, set, name, bio, fav: fav || set }));

// --- Rival company poaching (rival.js) -------------------------------------------------------
export const RIVAL = { fromDay: 6, chance: 0.25, bonus: 400, fee: 300 };

// --- Weekly boss (boss.js) -------------------------------------------------------------------
export const BOSS = {
  every: 7,            // a boss on day 7, 14, 21...
  arriveAt: 0.2,       // share of the work day when he walks in (~11:00)
  stay: 35,            // seconds before he leaves (and you lose)
  hp: 14, hpPerWeek: 6,
  damagePerWhipLevel: 0.5, // damage per hit = 1 + 0.5 x whip level
  moveEvery: 1.8,      // seconds between teleports
  dodgeChance: 0.3, dodgeTime: 1.0,
  chestMoney: 1500, chestGems: 15,
  steal: 0.08,         // share of the fund he walks off with
};

// --- Selling the company (prestige.js) --------------------------------------------------------
export const PRESTIGE = {
  minRevenue: 500000,      // total revenue needed before an investor makes an offer
  revenuePerShare: 120000, // shares = floor(sqrt(total revenue / this)): 500k → 2, 1.1M → 3, 12M → 10
  perShare: 0.1,           // +10% income per share, forever
};

// --- Daily features (daily.js) ---------------------------------------------------------------
// Everything runs offline on the phone's clock (clock moved back = no reward).
export const DAILY = {
  // away from the app: a full capHours away pays `days` work days of normal income (pro rata below)
  offline: { days: 1.5, capHours: 8, minMinutes: 5 },
  loginMoney: 400,                                     // money unit for login gifts (x day multiplier)
  // 7-day login calendar; missing a day starts again from day 1, day 7 loops back to day 1
  login: [{ money: 1 }, { gems: 5 }, { money: 2 }, { gems: 10 }, { money: 3 }, { gems: 15 }, { gems: 30, boost: 'hotBonus' }],
  questCount: 3,
  questBonus: 10,                                      // 💎 for finishing all of today's quests
  // n = target choices (one is picked), stat = counter that must grow by n since the quest started
  quests: [
    { id: 'catch', text: 'Bắt quả tang {n} kẻ lười', n: [25, 40, 60], gems: 5, stat: (g) => g.records.catches },
    { id: 'gamer', text: 'Bắt {n} người đang chơi game', n: [8, 12], gems: 5, stat: (g) => g.records.caught.game },
    { id: 'sleep', text: 'Đánh thức {n} người ngủ gật', n: [6, 10], gems: 5, stat: (g) => g.records.caught.sleep },
    { id: 'assist', text: 'Trợ lý bắt {n} kẻ lười', n: [10, 20], gems: 5, stat: (g) => g.records.assistCatches, need: (g) => g.assistantLevel >= 0 },
    { id: 'coffee', text: 'Dùng cà phê sốc {n} lần', n: [3, 5], gems: 5, stat: (g) => g.records.coffees, need: (g) => g.coffeeLevel >= 0 },
    { id: 'project', text: 'Hoàn thành {n} dự án', n: [1, 2], gems: 8, stat: (g) => g.projects.done },
    { id: 'reward', text: 'Khen thưởng nhân viên {n} lần', n: [3, 5], gems: 5, stat: (g) => g.records.rewardsGiven || 0 },
    { id: 'days', text: 'Làm xong {n} ngày làm việc', n: [2, 3], gems: 6, stat: (g) => g.day },
    { id: 'combo', text: 'Đạt combo x{n} trong một ngày', n: [5, 7], gems: 6, stat: (g) => g.today.bestCombo, best: true },
  ],
};

// --- Special staff (cv.js) -------------------------------------------------------------------
// Some applicants are special. hire / salary / lazy multiply the normal values.
export const STAFF_TYPES = {
  intern: { name: 'Thực tập sinh', short: 'TTS', chance: 0.15, hire: 0.4, salary: 0.4, lazy: 1.4, desc: 'Phí tuyển và lương chỉ 40%, nhưng hay lười hơn.' },
  lead: { name: 'Trưởng nhóm', short: 'TN', chance: 0.08, hire: 1.8, salary: 1.6, lazy: 0.8, desc: 'Người ngồi cạnh bớt lười 30%. Lương cao.' },
  nephew: { name: 'Con ông cháu cha', short: 'COCC', chance: 0.06, minDay: 3, hire: 0, salary: 1.2, lazy: 1.5, gift: 600,
    desc: 'Tuyển miễn phí, kèm quà của sếp tổng. Nhưng CẤM QUẤT: quất là bị phạt nặng. Dùng cà phê, khen thưởng để trị.' },
  spy: { name: 'Gián điệp', short: 'GĐ', chance: 0.06, minDay: 4, hire: 0.9, salary: 1, lazy: 1.2, hidden: true, steal: 3,
    desc: 'Lén rút tiền công ty mỗi khi lười. Bắt quả tang để lộ mặt và thu hồi gấp rưỡi.' },
};

// --- Payroll (payroll.js) ---------------------------------------------------------------------
// Salaries are paid every monthDays days at clock-out, together with the office rent.
export const PAYROLL = {
  monthDays: 5,                            // one game "month" = 5 work days
  daily: { dev: 260, acc: 190, des: 225 }, // salary per day before skill / raises / day multiplier
  raiseStep: 0.2,                          // +20% salary per raise level (staff care → "Tăng lương")
  rent: [60, 300, 900],                   // office rent per day by office level
  unpaidMotiv: -35, unpaidStress: 35,      // what unpaid staff do to morale
};

export const MOTIVATION = { start: 50, drift: 0.08, catch: -2, wrong: -15, afterStrike: 20 };
// cost is in đ before the day multiplier (costs grow with the company like income does)
export const STAFF_ACTIONS = {
  praise: { cost: 0, motiv: 10, stress: -10 },                    // once per employee per day
  bonus: { cost: 120, motiv: 25, stress: -25, boost: 20 },
  gift: { cost: 60, motiv: 15, energy: 40 },
  raise: { cost: 600, motiv: 30, maxLevel: 3, slackCut: 0.12 },  // cost x (level + 1); -12% slacking per level
  party: { cost: 80, motiv: 20, stress: -40, energy: 30 },        // per employee, once per day
  fire: { motiv: -8, stress: 10 },                                // effect on everyone who stays
};

// --- Surprise visits (events.js) ------------------------------------------------------------
// From day 2, some days get one visit at a random time between ~10:00 and ~16:00.
export const VISITS = {
  chance: 0.35, // per day
  duration: 25, // seconds of game time
  kinds: {
    tax: { name: 'Thanh tra thuế', line: 'Cho xem sổ sách nào!', rule: 'Giữ KPI ≥ 70% đến khi thanh tra về', kpi: 0.7, gems: 3, fine: 0.1 },
    // The labour inspector keeps getting distracted by their phone: whips while they are not
    // looking are not written up. watch/distracted = [min, max] seconds of each phase.
    labour: { name: 'Thanh tra lao động', line: 'Ở đây có ai bị bóc lột không?', rule: 'Không được quất ai trước mặt thanh tra!', gems: 4, finePerWhip: 60, watch: [3.5, 5.5], distracted: [2, 3.5] },
    vip: { name: 'Khách hàng VIP', line: 'Công ty các bạn trông chuyên nghiệp đấy!', rule: 'Giữ KPI ≥ 80% để ký hợp đồng lớn', kpi: 0.8, bonus: 1500 },
  },
};
