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
- Thêm vật thể mới mà người chơi cần chạm vào (ví dụ một máy móc mới) thì thêm nó vào `view.frame()`, để camera màn dọc không cắt mất.
- Thêm thư mục hoặc file mới ở gốc mà game cần khi chạy thì cập nhật cả 2 nơi: `mobile/scripts/copy-web.cjs` (`ENTRIES`) và `desktop/package.json` (`extraResources.filter`). File mới bên trong `js/`, `css/`, `fonts/` thì không cần sửa gì.

## Thêm nội dung

### Roi mới

Thêm một phần tử vào `WHIPS` trong `config.js`:

```js
{ name: 'Roi Băng', cost: 60000, bonus: 600, boost: 18, radius: 15, rope: '#2a5a8a', tip: '#cfffff', fx: 'elec' },
```

`fx` quyết định hiệu ứng lúc roi nổ (`wood`, `metal`, `elec`, `fire` trong `whip.js` → `crack`). Muốn có hiệu ứng mới (ví dụ `ice`) thì thêm nhánh trong `crack()`, và thêm âm thanh theo `level` trong `audio.whip()`.

### Kiểu lười mới

1. `SLACKS` trong `config.js`: `shopee: { label: 'Săn sale', excuse: 'Flash sale 0đ sếp ơi!' }`.
2. Vẽ biểu tượng trong bong bóng: `drawBubble` trong `sprites.js` → thêm `case 'shopee'`.
3. Vẽ màn hình máy tính tương ứng: `renderScreen` → thêm `case 'shopee'`.

### Nhân viên mới (vượt quá 8 người)

1. Thêm vào `STAFF_POOL` (tên, `role`, màu da/tóc/áo, `style` tóc).
2. Thêm vị trí bàn vào `SLOTS` trong `view.js` (tọa độ lưới isometric, nằm trong phòng).
3. Tăng `capacity` hoặc thêm cấp mới trong `OFFICE_LEVELS`. Nếu thêm cấp văn phòng thì sửa `roomLayer()` trong `sprites.js` (độ rộng tường/sàn theo `level`), và giới hạn `Math.min(2, …)` trong `state.js → load()`.

### Vai trò mới

Thêm vào `ROLES` (`label`, `income`, `screen`), rồi viết `case` trong `renderScreen` để màn hình hiển thị đúng công việc.

### Nội thất mới

1. `DECOR_ITEMS`: `{ id: 'plant', name: 'Cây kim tiền', desc: '…', cost: 700, level: 0 }`.
2. Vẽ trong phòng: `drawOfficeDecor` (`sprites.js`) → `if (has('plant')) { … }`.
3. Ảnh xem trước trong cửa hàng: thêm `.decor-plant::after { … }` trong `style.css`.

### Nâng cấp mới trong cửa hàng

1. Thêm bảng dữ liệu vào `config.js` và trường cấp độ vào `newGame()`.
2. `ui.js → renderPanel()`: thêm `item('key', …)`, rồi thêm biến của nó vào chữ ký `sig` để panel vẽ lại khi cần.
3. `main.js → act.buy(kind)`: xử lý `kind === 'key'`.
4. Tác dụng của nâng cấp viết trong `sim.js`.

## Cân bằng game

Tất cả nằm trong `TUNING` (`config.js`): độ dài ngày, tốc độ mất năng lượng, xác suất lười, thời gian đình công, tiền phạt, thời gian giữ combo, hệ số tăng thu nhập theo ngày, `touchSlop` (vùng chạm rộng thêm trên mobile), `awayCap` (số giây tối đa được bù khi rời app).

Một số công thức đáng chú ý:

- Thu nhập mỗi giây = `ROLES[role].income × (boost ? 1.6 : 1) × (1 + 0.12 × (day − 1))`.
- Xác suất lười mỗi giây = `slackBase + slackTired × (1 − energy/100)²`.
- Thưởng bắt quả tang = `bonus × (1 + 0.5 × (combo − 1))`. Trợ lý chỉ nhận 50% và không cộng combo.
- Phí tuyển người thứ n = `200 × 1.75^(n − 3)`.

## Danh sách việc nên làm tiếp (gợi ý ưu tiên)

**Trải nghiệm mobile**
- [ ] Hướng dẫn chơi lần đầu đầy đủ hơn. Hiện mới có dòng gợi ý dưới văn phòng (`hintText()` trong `ui.js`, hiện trong 8 roi đầu tiên); có thể thêm các bước giải thích KPI, đình công, cửa hàng.
- [ ] Nhấn giữ vào nhân viên để xem thẻ thông tin (bản desktop có tooltip khi rê chuột, mobile chưa có).
- [ ] Nút bật/tắt rung riêng (`platform.setHaptics` đã có, chỉ cần thêm nút và lưu vào `g`).
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
- [ ] Mobile: xoay màn hình, mở/đóng panel, nút Back Android ở từng hộp thoại, đưa app xuống nền 1 phút rồi mở lại (thời gian và tiền phải được bù).
- [ ] Đóng hẳn app rồi mở lại: save còn nguyên. "Chơi lại từ đầu" xóa sạch, kể cả bản sao trong Preferences.
- [ ] Màn hình có tai thỏ / Dynamic Island và thanh Home: thẻ thông tin và thanh tab không bị che.
- [ ] Máy nhỏ (iPhone SE 320×568) và máy lớn: chữ không xuống dòng sai, văn phòng không quá nhỏ.
- [ ] Bản PC (Electron) nếu vẫn phát hành: chế độ taskbar, kéo thả, click xuyên qua vẫn chạy.
