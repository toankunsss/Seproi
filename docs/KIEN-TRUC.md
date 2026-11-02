# Kiến trúc mã nguồn

Mã nguồn game là HTML/CSS/JavaScript: `index.html` nạp `js/main.js` dưới dạng ES module. Không có framework, bundler hay file ảnh/âm thanh. Hình pixel-art được vẽ bằng code lên `<canvas>`, âm thanh được tổng hợp bằng Web Audio. App mobile (`mobile/`, Capacitor) và bản PC (`desktop/`, Electron) đều đóng gói cùng mã nguồn này.

## Sơ đồ thư mục

```
index.html              khung trang: #stage (canvas + #fx + #hud), #panel, #modal
serve.cjs               server để xem thử khi phát triển (node serve.cjs → :5566/?shell=mobile)
icon.svg                icon (favicon cho bản PC)
css/style.css           toàn bộ giao diện DOM (HUD, panel, modal, mobile, taskbar)
css/fonts.css, fonts/   font VT323 và Press Start 2P (tự host, chạy offline)
js/
├── main.js       khởi động, vòng lặp, xử lý input, nối các module với nhau, các "action" của nút
├── platform.js   phát hiện nền tảng (app mobile / PC), plugin Capacitor, rung, sao lưu save
├── config.js     DỮ LIỆU GAME: roi, cà phê, trợ lý, nhân viên, văn phòng, nội thất, TUNING, cấp bậc
├── state.js      tạo game mới, load/save localStorage, nâng cấp save cũ
├── sim.js        mô phỏng: hành vi nhân viên, kinh tế, KPI, combo, trợ lý, cà phê
├── view.js       vẽ 2 chế độ (office isometric / mini taskbar), tỷ lệ phóng, tọa độ, chọn đối tượng
├── sprites.js    sprite thủ tục: phòng, bàn, màn hình, nhân viên, bong bóng, nội thất…
├── pixel.js      hàm vẽ cơ bản: rect, px, line, poly, iso, isoBox, glyphs, hash
├── whip.js       dây roi verlet, hiệu ứng (tia lửa, vòng sóng, sét, lửa), rung màn hình
├── ui.js         HUD, cửa hàng, bảng áp lực, phỏng vấn, đặt biệt danh, báo cáo cuối ngày, chữ bay
├── audio.js      hiệu ứng âm thanh tổng hợp (whip, ouch, coin, bell…)
└── pip.js        Document Picture-in-Picture (ghim thanh mini nổi trên Chrome/Edge)
desktop/                vỏ Electron (taskbar overlay); xem desktop/main.cjs
mobile/                 vỏ Capacitor (Android/iOS); xem docs/MOBILE.md
```

## Luồng chạy

```
main.js
  ├─ await restoreBackup()     (native: lấy save từ Preferences nếu localStorage trống)
  ├─ g = load()                state.js
  ├─ createView / createWhip / createUI
  ├─ await initPlatform()      nút Back, pause/resume, ẩn status bar & splash
  ├─ setMode(g.mode) → layout()
  └─ requestAnimationFrame loop:
        step(dt):
          simUpdate(g, dt, onEvent)   ← sim.js đổi g và phát sự kiện ('slack','strike','assistant','dayEnd'…)
          whip.update(dt)
          view.render(g, whip, t)     ← view.js vẽ từ g; ghi lại vùng trúng (view.hits)
          mỗi 0,1 s: ui.update() + fitShell() + fitMobile()
```

**Input**: `pointerdown` trên canvas → `view.toLocal` đổi sang tọa độ buffer → `view.pick(x, y, reach)` tìm nhân viên gần nhất → `whip.lash(...)`. Khi đầu roi chạm đích thì gọi `resolveHit` → `sim.whipEmployee(g, e)` trả về `{kind: 'catch'|'wrong'|'strike', reward}`, và `main.js` phát âm thanh, rung, chữ bay tương ứng.

**Nguyên tắc**: `sim.js` không biết gì về DOM hay canvas. `view.js` và `sprites.js` chỉ đọc `g`. `ui.js` gọi các hàm trong `act` (định nghĩa ở `main.js`) để thay đổi state. Mọi con số cân bằng game nằm trong `config.js`.

## State `g`

Được tạo bởi `newGame()` trong `state.js`:

| Trường | Ý nghĩa |
|---|---|
| `money`, `lifetimeEarnings` | quỹ hiện tại / tổng doanh thu (dùng để mở khóa văn phòng) |
| `day`, `dayTime` | ngày thứ mấy / số giây đã trôi trong ngày (0 → `TUNING.dayLength`) |
| `whipLevel`, `coffeeLevel`, `assistantLevel` | chỉ số trong `WHIPS` / `COFFEE` / `ASSISTANT` (−1 = chưa mua) |
| `coffeeCd`, `assistantCd` | thời gian hồi chiêu |
| `officeLevel`, `decor[]` | cấp văn phòng (0–2), id các món nội thất đã mua |
| `kpi`, `combo`, `comboT` | KPI (0–1, trung bình trượt), combo hiện tại |
| `staff[]` | nhân viên, xem bên dưới |
| `today` | thống kê ngày hiện tại (doanh thu, số lần bắt, số lần oan, combo…) |
| `records` | kỷ lục: `bestCombo`, `totalWhips`, `bestDays[]` (top 5) |
| `muted`, `mode` | tắt tiếng; `'office'` hoặc `'mini'` |

Mỗi nhân viên (`makeEmployee`) có: `id` (chỉ số trong `STAFF_POOL`), `name`, `nickname`, `role`, `look`, `profile`, `state` (`work` / `slack` / `hurt` / `angry` / `strike`), `slack` (loại lười), `t` và `dur` (đồng hồ của trạng thái), `energy`, `stress`, `boost`, `whips`, `wrong`, `flash`.

### Máy trạng thái nhân viên (`sim.js`)

```
work ──(xác suất tăng khi mệt)──▶ slack ──(bị quất)──▶ hurt ──0,7s──▶ work
  │                                  └──(hết dur)──▶ work
  └──(bị quất oan)──▶ angry ──1,6s──▶ work
mọi trạng thái ──(stress ≥ 100)──▶ strike ──15s──▶ work (stress = 40)
```

## Lưu game

- Key `whipboss.save.v1` trong `localStorage`. Chỉ lưu các trường bền; phần tạm (animation, trạng thái lười hiện tại) được dựng lại khi load.
- Thời điểm lưu: mỗi 5 giây, sau mỗi lần mua, khi tab hoặc app bị ẩn (`visibilitychange` / `pause` của Capacitor), và khi `pagehide`.
- Trên app native, mỗi lần lưu cũng ghi bản sao vào Capacitor Preferences (`platform.backup`). Lúc khởi động, nếu `localStorage` trống thì khôi phục từ bản sao (`restoreBackup`).
- `load()` có bước "migrate": điền giá trị mặc định qua `Object.assign(newGame(), s)` và chuẩn hóa `officeLevel` / `decor`. **Khi thêm trường mới vào `g`, chỉ cần thêm vào `newGame()`**, vì save cũ sẽ tự nhận giá trị mặc định. Nếu đổi ý nghĩa một trường cũ thì viết thêm bước chuyển đổi trong `load()`. Chỉ đổi `SAVE_KEY` khi chấp nhận xóa toàn bộ save cũ.

## Vẽ

- Canvas có độ phân giải gốc nhỏ (phòng: `ROOM_SIZE` 352×238; mini: `MINI_SLOT` × số nhân viên, cao 46), sau đó được phóng bằng CSS với `image-rendering: pixelated`.
- `view.resize(cw, ch)` chọn tỷ lệ `scale`: desktop dùng số nguyên (hoặc bước 0,25 nếu < 2); mobile dùng bước 0,05 (`fineScale`).
- Lớp phòng (tường, sàn) được vẽ một lần cho mỗi cấp văn phòng rồi cache lại (`roomLayer`). Nhân viên được sắp xếp theo chiều sâu isometric `gx + gy`.
- Vị trí bàn: `SLOTS` trong `view.js`, theo thứ tự tuyển dụng. Muốn tăng số nhân viên tối đa thì phải thêm slot ở đây.
- Vùng trúng (`view.hits`) được tính lại mỗi frame, đúng theo hình vừa vẽ.

## Lớp nền tảng

| | `shell` (Electron) | `mobile` | `native` |
|---|---|---|---|
| Phát hiện | có `window.taskbarShell` (preload) | `native`, hoặc `?shell=mobile` khi xem thử | `Capacitor.isNativePlatform()` |
| Class CSS | `body.shell` | `html.mobile` | `html.native`, `html.native-android` / `html.native-ios` |
| Khác biệt | chế độ mini trong suốt, click xuyên qua, kéo thả, khay hệ thống | HUD 2 cột, khóa chế độ office, chạm rộng hơn, rung | plugin Capacitor: App, Haptics, Preferences, StatusBar, SplashScreen |


## Bố cục DOM

- `#stage` chứa `canvas#game`, `#fx` (chữ bay), `#hud`.
- Desktop: `#hud` phủ lên canvas, gồm `.bar.top` và `.bar.bottom`.
- Mobile: `ui.js` dựng markup khác (`MOBILE_HUD`) gồm `.side.left` (chỉ số) và `.side.right` (nút). `#hud` dùng `display: contents` nên hai cột này trở thành phần tử flex của `#stage`. `fitMobile()` trong `main.js` đo hai cột rồi giao phần còn lại cho canvas.
- Cả hai bố cục dùng chung `data-k` (ô hiển thị) và `data-a` (hành động), nên `ui.update()` không cần biết đang ở bố cục nào.
