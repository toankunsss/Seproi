# Hướng dẫn phát triển tiếp

## Quy trình

1. Chạy `node serve.cjs`, mở http://localhost:5566/?shell=mobile với chế độ giả lập điện thoại **màn dọc** trong DevTools (Pixel 7, iPhone 13, và một máy nhỏ như iPhone SE) để xem nhanh. Bản PC thì mở không kèm `?shell=mobile`.
2. Sửa code ở `js/`, `css/`, rồi tải lại trang (server tắt cache).
3. Thử trên app: `cd mobile && npm run sync`, sau đó chạy lại từ Android Studio/Xcode (hoặc `npm run run:android`).
4. Desktop: `cd desktop && npm start`. `npm run shot` chụp ảnh tự động và kiểm tra kéo thả.
5. Thử trên điện thoại thật trước khi phát hành (rung, nút Back, ra/vào app chỉ kiểm tra được trên máy thật).
6. Commit. Workflow GitHub Actions sẽ build APK để kiểm tra Android không bị hỏng.

Mẹo console: `__game.g.money = 1e6`, `__game.g.dayTime = 148` (sắp tan ca), `__game.g.staff[0].stress = 99` (sắp đình công).

## Quy ước code

- ES modules thuần, không bundler. Đường dẫn import phải ghi đủ `./x.js`. **Không `import` package npm trong `js/`** (WebView không hiểu); plugin native gọi qua `platform.js`.
- Dữ liệu và con số cân bằng để ở `config.js`, không viết số cứng trong logic.
- `sim.js` không đụng DOM. Logic mới thì đặt ở `sim.js`, rồi phát sự kiện qua `emit` để `main.js` lo âm thanh, rung, chữ bay.
- Chữ hiển thị là tiếng Việt. Khi chèn dữ liệu người chơi nhập vào HTML, luôn bọc bằng `esc()` (xem `ui.js`).
- Mọi nút trên mobile phải cao ≥ 44 px. Nút mới trên HUD phải thêm vào **cả** markup desktop lẫn `MOBILE_HUD` trong `ui.js`. Thanh tab mobile đang có 4 ô (`grid-template-columns: repeat(4, 1fr)`); thêm tab thứ 5 thì nhớ sửa CSS và kiểm tra trên màn 320 px.
- Vật thể mới trong văn phòng (máy móc, nội thất) phải vẽ ở **cả hai** cảnh: phòng isometric (`sprites.js`, dùng cho PC và màn ngang) và văn phòng dọc (`portrait.js → drawWall`, xếp dọc chân tường từ hai đầu vào). Nhớ thử với văn phòng 4 bàn, vì tường ở đó hẹp nhất (114 px).
- Thêm thư mục hoặc file mới ở gốc mà game cần khi chạy thì cập nhật cả 2 nơi: `mobile/scripts/copy-web.cjs` (`ENTRIES`) và `desktop/package.json` (`extraResources.filter`). File mới bên trong `js/`, `css/`, `fonts/` thì không cần sửa gì.

## Thêm nội dung

### Roi mới

Thêm một phần tử vào `WHIPS` trong `config.js`:

```js
{ name: 'Roi Băng', cost: 200000, bonus: 600, boost: 18, radius: 15, rope: '#2a5a8a', tip: '#cfffff', fx: 'elec' },
```

`fx` quyết định hiệu ứng lúc roi nổ (`wood`, `metal`, `elec`, `fire` trong `whip.js` → `crack`). Muốn có hiệu ứng mới (ví dụ `ice`) thì thêm nhánh trong `crack()`, và thêm âm thanh theo `level` trong `audio.whip()`.

### Kiểu lười mới

1. `SLACKS` trong `config.js`: `shopee: { label: 'Săn sale', excuse: 'Flash sale 0đ sếp ơi!' }`.
2. Vẽ biểu tượng trong bong bóng: `drawBubble` trong `sprites.js` → thêm `case 'shopee'`.
3. Vẽ màn hình máy tính tương ứng: `renderScreen` → thêm `case 'shopee'`.

### Nhân viên mới (vượt quá 8 người)

1. Thêm vào `STAFF_POOL` (tên, `role`, màu da/tóc/áo, `style` tóc).
2. Thêm vị trí bàn vào `SLOTS` trong `view.js` (tọa độ lưới isometric, nằm trong phòng). Văn phòng dọc tự xếp thêm ô; nếu sức chứa vượt 8 thì xem lại các lựa chọn số cột trong `portraitLayout()`.
3. Tăng `capacity` hoặc thêm cấp mới trong `OFFICE_LEVELS`. Nếu thêm cấp văn phòng thì sửa `roomLayer()` trong `sprites.js` (độ rộng tường/sàn theo `level`), và giới hạn `Math.min(2, …)` trong `state.js → load()`.

### Vai trò mới

Thêm vào `ROLES` (`label`, `income`, `screen`), rồi viết `case` trong `renderScreen` để màn hình hiển thị đúng công việc.

### Nội thất mới

1. `DECOR_ITEMS`: `{ id: 'plant', name: 'Cây kim tiền', desc: '…', cost: 700, level: 0 }`.
2. Vẽ trong phòng isometric: `drawOfficeDecor` (`sprites.js`) → `if (has('plant')) { … }`. Vẽ thêm ở văn phòng dọc: `drawWall` trong `portrait.js`.
3. Ảnh xem trước trong cửa hàng: thêm `.decor-plant::after { … }` trong `style.css`.

### Nâng cấp mới trong cửa hàng

1. Thêm bảng dữ liệu vào `config.js` và trường cấp độ vào `newGame()`.
2. `ui.js → renderPanel()`: thêm `item('key', …)`, rồi thêm biến của nó vào chữ ký `sig` để panel vẽ lại khi cần.
3. `main.js → act.buy(kind)`: xử lý `kind === 'key'`.
4. Tác dụng của nâng cấp viết trong `sim.js`.

### Thành tựu mới

Thêm vào `ACHIEVEMENTS` trong `config.js`:

```js
{ id: 'coffee50', name: 'Nghiện cà phê', desc: 'Dùng Cà phê sốc 50 lần', goal: 50, gems: 10, stat: (g) => g.records.coffees },
```

Nếu cần bộ đếm mới, thêm vào `freshRecords()` trong `state.js` (save cũ tự nhận giá trị mặc định), rồi tăng nó ở chỗ phù hợp. Nhớ thêm bản dịch tên và mô tả vào `js/lang/en.js`.

Các bộ đếm có sẵn trong `g.records`: `catches`, `caught.{game,toptop,sleep,crypto}`, `assistCatches`, `bestCombo`, `totalWhips`, `strikes`, `coffees`, `boostsUsed`, `gemsEarned` (mọi 💎 kiếm được phải đi qua `addGems()` trong `achievements.js`), `peakMoney`, `bestKpi`, `fairDays`, `starsHired`, `projStreak`/`bestProjStreak`, `bigProjects`, `bestDays`, `adsWatched`. Hiện có 50 thành tựu, tổng thưởng 1.200 💎.

### Vật phẩm 💎 mới

1. Thêm vào `PREMIUM_ITEMS` (`kind: 'perk'` mua 1 lần, `kind: 'boost'` mua nhiều lần).
2. Điều kiện mua (nếu có): `premium.js → blockedReason`.
3. Hiệu ứng: `premium.js → buyPremium` (dùng ngay), hoặc kiểm tra `hasPerk(g, 'id')` trong `sim.js` (vĩnh viễn).
4. Hình minh hoạ trong cửa hàng: thêm một hàm vẽ cùng `id` vào `DRAW` trong `js/item-art.js` (lưới 24×24, dùng `rect`/`px`/`line`). Nếu thiếu hình, khung ảnh sẽ để trống.

### Loại dự án, khách hàng, dữ liệu CV

Thêm vào `PROJECT_TYPES` (`roles` = trọng số từng nghề), `CLIENTS`, `CV_NAMES`, `CV_HOBBIES`, `CV_LINES`, `CV_QUOTES`. Bộ sinh tự dùng dữ liệu mới. Chữ mới cần thêm bản dịch.

### Đa ngôn ngữ

- **Thêm chữ mới vào giao diện:** viết tiếng Việt trong `t('...')`, rồi thêm dòng tương ứng vào `js/lang/en.js`. Không ghép chuỗi kiểu `'Ngày ' + n`; hãy dùng `t('Ngày {n}', { n })` để người dịch đổi được thứ tự từ.
- **Thêm ngôn ngữ mới** (ví dụ tiếng Nhật):
  1. Chép `js/lang/en.js` thành `js/lang/ja.js` và dịch phần giá trị, giữ nguyên `{biến}`.
  2. Trong `js/i18n.js`: `import ja from './lang/ja.js';` rồi thêm `ja: { name: '日本語', dict: ja, locale: 'ja-JP' }` vào `LANGS`. Nút chọn sẽ tự xuất hiện trong menu Thêm.
  3. Kiểm tra font: VT323 và Press Start 2P chỉ có chữ Latin (có dấu tiếng Việt). Ngôn ngữ dùng chữ khác (Nhật, Hàn, Trung, Thái…) cần thêm font pixel hỗ trợ bộ chữ đó vào `fonts/` và `css/fonts.css`.
- **Kiểm tra sót chữ:** mở game với trình duyệt đặt tiếng Anh, đi qua mọi màn hình, xem còn câu tiếng Việt nào không (tên người và tên thương hiệu được giữ nguyên).

### Hành động chăm sóc nhân viên mới

Thêm vào `STAFF_ACTIONS` (`config.js`) với các hiệu ứng `motiv`/`stress`/`energy`/`boost`, xử lý điều kiện riêng trong `staff.js → blocked`, rồi thêm một nút `staffBtn('tên', e, 'Nhãn')` trong `screens.js → staffScreen` và câu chúc mừng trong `main.js → staffDo`. Giá nhân với hệ số ngày (`1 + 0,12 × (ngày − 1)`), nên luôn tương xứng với thu nhập.

### Kiểu ghé thăm mới (ví dụ "Sếp tổng")

1. Thêm vào `VISITS.kinds` (`config.js`): `name`, `line` (câu nói khi đến), `rule` (hiện trên băng thông báo) cùng các tham số riêng.
2. Luật và kết quả: `events.js → endVisit` (và `updateVisit` nếu cần theo dõi gì trong lúc thăm).
3. Ngoại hình: thêm mục vào `VISITOR_LOOK` trong `sprites.js` (màu đồ, mũ, huy hiệu, đồ cầm tay).
4. Câu thông báo kết quả: `main.js → showVisitResult`. Thêm bản dịch vào `js/lang/en.js`.

### Bài nhạc mới

Nhạc nằm trong `SONGS` của `js/music.js`. Mỗi bài có `bpm`, `vol`, một hợp âm cho mỗi ô nhịp (`chords`, xem bảng `CHORDS`), giai điệu `lead` (8 nốt móc đơn mỗi ô nhịp: `E5` là nốt, `.` là nghỉ, `-` là ngân tiếp nốt trước) và trống `drums` (16 bước: `k` trống cái, `s` trống snare, `h` hi-hat). Bài dài có thể chia đoạn bằng `parts` + `order` (xem bài `office`). Phát bằng `music.play('tên')`.

### Logo, icon, ảnh store

Sửa `drawLogo()` / `drawTitle()` trong `js/brand.js`, rồi chạy `node tools/brand/make-brand.cjs` (hoặc `npm run icons` trong `mobile/` để cập nhật luôn icon Android/iOS). Xem bảng file đầu ra trong `docs/MOBILE.md` → "Icon và màn hình chờ".

### Video giới thiệu

`tools/promo/make.sh` quay video từ game thật (tiếng Anh): mở màn tiêu đề, bấm Bắt đầu, rồi đi qua quất nhân viên, tuyển CV, dự án, thanh tra, khen thưởng, cửa hàng 💎, thành tựu, văn phòng cuối game. Kết quả: `tools/promo/out/WhipBoss-promo-portrait.mp4` (1080x1920) và `WhipBoss-promo-landscape.mp4` (1920x1080). Cần Playwright (Chromium), python3 + numpy, ffmpeg. Kịch bản và chữ trên video nằm trong `tools/promo/record.cjs`; nhạc và hiệu ứng âm thanh trong `tools/promo/soundtrack.py`.

## Cân bằng game

Tất cả nằm trong `TUNING` (`config.js`): độ dài ngày, tốc độ mất năng lượng, xác suất lười, thời gian đình công, tiền phạt, thời gian giữ combo, hệ số tăng thu nhập theo ngày, `touchSlop` (vùng chạm rộng thêm trên mobile), `awayCap` (số giây tối đa được bù khi rời app, chỉ áp dụng cho bản PC; bản điện thoại tạm dừng khi rời app).

Một số công thức đáng chú ý:

- Thu nhập mỗi giây = `ROLES[role].income × (boost ? 1.6 : 1) × (1 + 0.12 × (day − 1))`.
- Xác suất lười mỗi giây = `slackBase + slackTired × (1 − energy/100)²`.
- Thưởng bắt quả tang = `bonus × (1 + 0.5 × (combo − 1))`. Trợ lý chỉ nhận 50% và không cộng combo.
- Phí tuyển người thứ n = `300 × 1.85^(n − 3)` (rồi nhân theo chất lượng CV, `cv.js → hirePrice`).

### Kinh tế (bản 1.0.4)

- **Lương tháng** (`PAYROLL`, `payroll.js`): 1 tháng = 5 ngày. Tan ca ngày 5, 10, 15… trả lương cả tháng + tiền thuê văn phòng. Lương/ngày = `daily[nghề] × kỹ năng × (1 + 0,2 × bậc lương) × hệ số ngày`; thuê văn phòng 60 / 300 / 900 đ/ngày. Người mới tuyển chỉ tính lương từ ngày vào làm; sa thải phải trả lương các ngày đã làm trong tháng (không lách được kỳ lương). Không đủ tiền: trả hết số đang có, nhân viên −35 động lực, +35 áp lực (dễ đình công). Báo cáo tan ca hiện kỳ lương hoặc số ngày còn lại; CV hiện lương/ngày; mục Nhân sự trong Quản lý hiện tổng lương tháng.
- **Đã vá các lỗ hổng** (đo bằng `tools/balance/econ.cjs`): thu nhập thụ động không còn "miễn phí" (đã có lương); thưởng bắt quả tang tăng theo hệ số ngày (trước chỉ chiếm 4% thu nhập, giờ cùng trợ lý khoảng 25%); combo tối đa x4 (`comboCap`); dự án chỉ trả tiền (bỏ 💎) và giảm còn hệ số 3,5; quảng cáo cuối ngày chỉ +50% doanh thu, không tính tiền dự án (`adDayBonus`); "Rút quỹ đầu tư" chỉ trả nửa doanh thu ngày tốt nhất và không tính vào tổng doanh thu; thu nhập khi vắng mặt quy đổi theo ngày làm việc (8 giờ = 1,5 ngày).
- **Giá cửa hàng 💎**: Máy chấm công AI 250, Ghế massage 200, Thư ký riêng 450, **Roi Kim Cương 999**, Thưởng nóng 30, Cà phê thượng hạng 25, Săn đầu người 60, Rút quỹ đầu tư 80.
- **Nguồn 💎**: thành tựu, nhiệm vụ hằng ngày (5–8 💎/nhiệm vụ + 10 khi xong cả 3), quà đăng nhập, quảng cáo (+5, 6 lần/ngày), thanh tra, quà hướng dẫn.
- **Bán công ty** (`PRESTIGE`): cần tổng doanh thu 300.000 đ; cổ phần = ⌊√(doanh thu / 75.000)⌋; mỗi cổ phần +10% thu nhập (làm việc, bắt quả tang, khi vắng mặt) vĩnh viễn. Giữ 💎, đặc quyền (Roi Kim Cương vẫn còn), thành tựu, kỷ lục.

### Nhịp tiến triển (đã cân lại giá)

Với lương tháng và các bản vá trên, người chơi giỏi biết để dành tiền trả lương (không xem quảng cáo) có tiến trình: văn phòng 6 bàn ngày 3–6, **Trụ sở 8 bàn ngày 16–17**, cà phê tối đa ngày 20–21, Cúp Sếp xuất sắc ngày 21–22, trợ lý tối đa ngày 23–25, **Roi Rồng Lửa ngày 27–28**. Người xem quảng cáo nhanh hơn khoảng 1,5 lần (Trụ sở ngày 10–12).

Các con số này đo bằng `tools/balance/econ.cjs` (cần `node serve.cjs` đang chạy): một "bot" chạy đúng code mô phỏng (`sim.js`): quất kẻ lười sau 1,2 giây, dùng cà phê ngay khi sẵn, luôn nhận dự án, mua đồ ngay khi đủ tiền (ưu tiên tuyển → văn phòng → roi → trợ lý → cà phê → nội thất). Khi đổi giá hay thu nhập, nên chạy lại bot để xem ngày mua từng món thay đổi thế nào.

## Danh sách việc nên làm tiếp (gợi ý ưu tiên)

**Trải nghiệm mobile**
- [ ] Hướng dẫn chơi lần đầu đầy đủ hơn. Hiện mới có dòng gợi ý dưới văn phòng (`hintText()` trong `ui.js`, hiện trong 8 roi đầu tiên); có thể thêm các bước giải thích KPI, đình công, cửa hàng.
- [ ] Nhấn giữ vào nhân viên để xem thẻ thông tin (bản desktop có tooltip khi rê chuột, mobile chưa có).
- [ ] Nút bật/tắt rung riêng (`platform.setHaptics` đã có, chỉ cần thêm nút và lưu vào `g`).
- [ ] Nối AdMob thật (xem `docs/QUANG-CAO.md`); hiện quảng cáo đang giả lập.
- [ ] Nhiệm vụ hằng ngày (3 nhiệm vụ nhỏ mỗi sáng, thưởng 💎), dùng chung cơ chế `stat(g)` của thành tựu.
- [ ] Thu nhập offline: khi mở lại app sau nhiều giờ, trả một phần thu nhập (ví dụ 20%, tối đa 2 giờ) kèm hộp thoại "Trong lúc sếp vắng mặt…". Cần lưu `savedAt` trong `save()`.
- [ ] Thông báo đẩy cục bộ (`@capacitor/local-notifications`), ví dụ "Nhân viên đang lười, KPI tụt!", để kéo người chơi quay lại.

**Nội dung và gameplay**
- [ ] Thêm kiểu lười, roi, nội thất và cấp văn phòng thứ 4 (xem hướng dẫn ở trên).
- [ ] Sự kiện ngẫu nhiên: sếp tổng đi kiểm tra (nhân đôi phạt), deadline (nhân đôi thu nhập).
- [ ] Thành tựu, dùng `records` có sẵn.
- [ ] Prestige: "bán công ty" để nhận hệ số thu nhập vĩnh viễn.

**Kỹ thuật**
- [ ] Test tự động: `sim.js` là hàm thuần, có thể test bằng `node --test` (tạo `g` từ `newGame()`, rồi gọi `update`).
- [ ] Script Playwright chụp màn hình mobile ở các kích thước phổ biến, chạy trong CI.
- [ ] Chuẩn hóa phiên bản cho cả 3 nơi (`mobile/package.json`, `desktop/package.json`, `build.gradle`) bằng một script.
- [ ] Nhạc nền (Web Audio, theo cùng cách tổng hợp như `audio.js`), có nút tắt riêng.
- [ ] Đa ngôn ngữ: gom chuỗi trong `ui.js` và `config.js` vào một file `i18n`.

## Kiểm thử thủ công trước khi phát hành

- [ ] Ngày 1 → tan ca → báo cáo → ngày 2 (trên cả desktop và mobile).
- [ ] Mua roi, cà phê, trợ lý, nâng văn phòng, mua nội thất; phỏng vấn và tuyển người; đặt biệt danh.
- [ ] Quất oan nhiều lần để thấy đình công.
- [ ] Mobile: xoay màn hình, mở/đóng panel, nút Back Android ở từng hộp thoại, đưa app xuống nền 1 phút rồi mở lại (game phải đứng yên và hiện ô Tạm dừng; bấm Tiếp tục thì chạy lại), bấm Back khi không có gì mở (hiện ô Tạm dừng), cuộn các bảng dài (tiêu đề và nút × phải đứng yên).
- [ ] Đóng hẳn app rồi mở lại: save còn nguyên. "Chơi lại từ đầu" xóa sạch, kể cả bản sao trong Preferences.
- [ ] Màn hình có tai thỏ / Dynamic Island và thanh Home: thẻ thông tin và thanh tab không bị che.
- [ ] Máy nhỏ (iPhone SE 320×568) và máy lớn: chữ không xuống dòng sai, văn phòng không quá nhỏ.
- [ ] Bản PC (Electron) nếu vẫn phát hành: chế độ taskbar, kéo thả, click xuyên qua vẫn chạy.
