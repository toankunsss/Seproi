# Kiến trúc mã nguồn

Mã nguồn game là HTML/CSS/JavaScript: `index.html` nạp `js/main.js` dưới dạng ES module. Không có framework, bundler hay file ảnh/âm thanh. Hình pixel-art được vẽ bằng code lên `<canvas>`, âm thanh được tổng hợp bằng Web Audio. App mobile (`mobile/`, Capacitor) và bản PC (`desktop/`, Electron) đều đóng gói cùng mã nguồn này.

## Sơ đồ thư mục

```
index.html              khung trang: #stage (canvas + #fx + #hud), #panel, #modal
serve.cjs               server để xem thử khi phát triển (node serve.cjs → :5566/?shell=mobile)
icon.svg                favicon (sinh từ js/brand.js bởi tools/brand/make-brand.cjs)
tools/brand/            make-brand.cjs: sinh icon app, splash, ảnh Google Play từ js/brand.js
tools/promo/            make.sh: quay video giới thiệu (tiếng Anh) từ game thật cho Google Play
css/style.css           toàn bộ giao diện DOM (HUD, panel, modal, mobile, taskbar)
css/fonts.css, fonts/   font VT323 và Press Start 2P (tự host, chạy offline)
js/
├── main.js       khởi động, vòng lặp, xử lý input, nối các module với nhau, các "action" của nút
├── platform.js   phát hiện nền tảng (app mobile / PC), plugin Capacitor, rung, sao lưu save
├── config.js     DỮ LIỆU GAME: roi, cà phê, trợ lý, nhân viên, văn phòng, nội thất, TUNING, cấp bậc,
│                 dữ liệu CV, loại dự án, khách hàng, vật phẩm 💎, giới hạn quảng cáo, thành tựu
├── state.js      tạo game mới, load/save localStorage, nâng cấp save cũ
├── sim.js        mô phỏng: hành vi nhân viên (theo chỉ số CV), kinh tế, KPI, combo, trợ lý, cà phê, tiến độ dự án
├── cv.js         tuyển dụng: sinh ứng viên & CV, hệ số chỉ số (skill/lazy/grit), giá tuyển, ảnh chân dung pixel
├── projects.js   dự án (nghiệp vụ): sinh hợp đồng theo đội hiện tại, cộng điểm, hoàn thành, gia hạn, thất bại
├── achievements.js  danh sách thành tựu, đếm số chờ nhận, nhận thưởng 💎
├── premium.js    cửa hàng 💎: điều kiện mua, hiệu ứng của đặc quyền & vật phẩm dùng ngay
├── item-art.js   hình pixel-art 24×24 của từng vật phẩm 💎 (hiện trong cửa hàng)
├── events.js     ghé thăm bất ngờ: thanh tra thuế, thanh tra lao động (lúc nhìn / lúc lơ đãng), khách VIP
├── staff.js      chăm sóc nhân sự: động lực, khen ngợi/thưởng/quà/tăng lương/liên hoan, sa thải, cấp mã nhân viên
├── ads.js        quảng cáo có thưởng: showRewarded(); AdMob khi có, nếu không thì quảng cáo giả lập
├── i18n.js       đa ngôn ngữ: t('câu tiếng Việt'), chọn/nhớ ngôn ngữ; từ điển trong js/lang/ (en.js…)
├── view.js       vẽ các chế độ (office isometric / văn phòng dọc / mini taskbar), tỷ lệ phóng, tọa độ, chọn đối tượng
├── portrait.js   văn phòng cho điện thoại cầm dọc: bức tường + lưới ô làm việc, bàn trống để tuyển
├── sprites.js    sprite thủ tục: phòng, bàn, màn hình, nhân viên, bong bóng, nội thất…
├── pixel.js      hàm vẽ cơ bản: rect, px, line, poly, iso, isoBox, glyphs, hash
├── whip.js       dây roi verlet, hiệu ứng (tia lửa, vòng sóng, sét, lửa), rung màn hình
├── ui.js         HUD, bảng Quản lý, bảng áp lực, nội thất, đặt biệt danh, báo cáo cuối ngày, chữ bay
├── screens.js    hộp thoại meta: CV ứng viên, Dự án, Cửa hàng 💎, Thành tựu, menu Thêm (chọn ngôn ngữ)
├── audio.js      hiệu ứng âm thanh tổng hợp (whip, ouch, coin, bell…)
├── music.js      nhạc nền 8-bit tự tổng hợp (bộ sequencer nhỏ; bài 'title' và 'office'), chỉ bật trên điện thoại
├── campaign.js   Chiến dịch: 15 màn / 3 chương, luật riêng (g.mods), 3 mục tiêu = 3 sao; chơi trên bản sao, chỉ lưu công ty thật
├── boss.js       trùm tuần "Siêu Nhân Viên Lười" (ngày 7, 14…): máu, dịch chuyển, khiên, rương thưởng / bị cuỗm tiền
├── minigames.js  mini-game giữa ngày: săn chuột, kiểm tra máy tính, họp giao ban
├── inventory.js  trang phục sếp: 6 ô, 4 độ hiếm, chỉ số cộng thêm, rơi đồ ngẫu nhiên, hình sếp mặc đồ (ảnh đại diện góc trái)
├── skills.js     XP, cấp sếp, cây kỹ năng (mắt diều hâu, lãnh đạo, kỷ luật, đàm phán, tiếng gầm)
├── depts.js      phòng ban theo nghề, trưởng phòng, KPI từng phòng
├── rival.js      công ty đối thủ "Lười Corp" lôi kéo nhân viên giỏi
├── cosmetics.js  skin roi, thú cưng văn phòng, album 40 nhân vật
├── share.js      ảnh chia sẻ 1080x1350 (báo cáo, công ty, "Sếp vừa quất…", màn chơi) + link CH Play
├── payroll.js    lương tháng: 5 ngày = 1 tháng, trả lương + thuê văn phòng lúc tan ca; thiếu tiền → nhân viên bất mãn
├── daily.js      thu nhập khi vắng mặt, quà đăng nhập 7 ngày, 3 nhiệm vụ hằng ngày (theo đồng hồ máy, chặn chỉnh lùi giờ)
├── prestige.js   bán công ty lấy cổ phần (+10% thu nhập/cổ phần, vĩnh viễn), chơi lại từ đầu
├── tutorial.js   hướng dẫn lần đầu (điện thoại, game mới): trợ lý chỉ từng bước, vùng sáng + ngón tay, chặn chạm ngoài vùng; g.tutorial (99 = xong)
├── title.js      màn hình tiêu đề (điện thoại): nền thành phố đêm, logo, nút Bắt đầu/Chơi tiếp, âm thanh/nhạc/ngôn ngữ
├── brand.js      logo + chữ "WHIP BOSS" pixel; nguồn của icon app, splash, ảnh Google Play (tools/brand/make-brand.cjs)
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
- **Văn phòng màn dọc** (`js/portrait.js`, bật khi `view.portrait`): căn phòng isometric vốn vẽ cho màn ngang, ép vào màn dọc thì nhân viên rất nhỏ. Vì vậy trên điện thoại cầm dọc, game vẽ một cảnh riêng:
  - **Bức tường phía trên** (`drawWall`): cửa sổ có màu trời đổi theo giờ, đồng hồ, cây cảnh, cùng máy cà phê, tủ sách, cúp, sofa, bể cá, đèn và trợ lý khi đã mua.
  - **Lưới ô làm việc** (`drawCubicle`): vách ngăn đổi màu theo vai trò, bàn, màn hình hướng về người chơi, và nhân viên nhìn từ sau lưng (dùng lại `drawEmployee`).
  - **Ô trống**: ô chưa có người (trong sức chứa văn phòng) vẽ bàn trống với dấu "+". Chạm vào thì `main.js` mở bảng Quản lý để tuyển người (`view.pickSlot`).
  - **Kích thước lưới** (`portraitLayout(capacity, cw, ch)`): văn phòng 4 bàn dùng 2 cột, 6 bàn dùng 3 cột. Văn phòng 8 bàn chọn 3 hoặc 4 cột, tùy cái nào cho tỷ lệ phóng lớn hơn trên máy đó; ô thừa của lưới 3×3 là góc nghỉ (bình nước và cây).
  - **Vùng chạm** của mỗi nhân viên là cả ô của họ. Thanh áp lực vẽ ở đáy ô.
  - **Màn ngang dự phòng** (tablet) và bản PC vẫn dùng phòng isometric.
- Lớp phòng (tường, sàn) được vẽ một lần cho mỗi cấp văn phòng rồi cache lại (`roomLayer`). Nhân viên được sắp xếp theo chiều sâu isometric `gx + gy`.
- Vị trí bàn: `SLOTS` trong `view.js` (phòng isometric), theo thứ tự tuyển dụng. Muốn tăng số nhân viên tối đa thì phải thêm slot ở đây. Trên màn dọc, ô thứ i của lưới là nhân viên thứ i, nên không cần khai báo vị trí.
- Vùng trúng (`view.hits`) được tính lại mỗi frame, đúng theo hình vừa vẽ.

## Lớp nền tảng

| | `shell` (Electron) | `mobile` | `native` |
|---|---|---|---|
| Phát hiện | có `window.taskbarShell` (preload) | `native`, hoặc `?shell=mobile` khi xem thử | `Capacitor.isNativePlatform()` |
| Class CSS | `body.shell` | `html.mobile` | `html.native`, `html.native-android` / `html.native-ios` |
| Khác biệt | chế độ mini trong suốt, click xuyên qua, kéo thả, khay hệ thống | bố cục dọc + thanh tab, văn phòng dạng lưới ô (`portrait.js`), khóa chế độ office, chạm rộng hơn, rung | plugin Capacitor: App, Haptics, Preferences, StatusBar, SplashScreen |


## Bố cục DOM

- `#stage` chứa `canvas#game`, `#fx` (chữ bay), `#hud`.
- Desktop: `#hud` phủ lên canvas, gồm `.bar.top` và `.bar.bottom`.
- Mobile: `ui.js` dựng markup khác (`MOBILE_HUD`) gồm hai nhóm:
  - `.side.info`: thẻ thông tin dạng lưới (tiền · giờ / KPI / roi · combo · trợ lý).
  - `.side.controls`: dòng gợi ý `.hint`, nút Cà phê, và `.tabbar` (4 tab có icon SVG pixel định nghĩa trong `ICON`).

  `#hud` dùng `display: contents` nên hai nhóm này trở thành phần tử flex của `#stage`. Màn dọc xếp theo thứ tự thẻ thông tin → canvas → điều khiển. Màn ngang (chỉ là dự phòng) đưa hai nhóm thành hai cột bên cạnh canvas. `fitMobile()` trong `main.js` đo hai nhóm, giao phần còn lại cho canvas, và bật cảnh văn phòng dọc (`view.portrait`) khi màn dọc. Bảng Quản lý (`#panel`) hiện thành bottom sheet trượt lên từ đáy.
- Cả hai bố cục dùng chung `data-k` (ô hiển thị) và `data-a` (hành động), nên `ui.update()` không cần biết đang ở bố cục nào.

## Hệ thống meta (tuyển dụng, dự án, thành tựu, 💎, quảng cáo)

| Hệ thống | Dữ liệu (`config.js`) | Logic | Giao diện | Trường trong save |
|---|---|---|---|---|
| Tuyển dụng bằng CV | `CV_*`, `CANDIDATES_PER_DAY` | `cv.js` | `screens.js → cvScreen` | `candidates`, `candidatesDay`, `staff[].cv` |
| Dự án (nghiệp vụ) | `PROJECT_TYPES`, `CLIENTS`, `WORK_RATE` | `projects.js` + `sim.js` (`addWork`) | `screens.js → projectsScreen`, thanh dự án trên HUD | `projects { offers, offersDay, active, reward, done, failed }` |
| Thành tựu | `ACHIEVEMENTS` (mỗi cái có `stat(g)`, `goal`, `gems`) | `achievements.js` | `screens.js → achScreen` | `claimed`, các bộ đếm trong `records` |
| Kim cương 💎 | `GEMS_START`, `PREMIUM_ITEMS` | `premium.js`, `sim.js` (`hasPerk`) | `screens.js → vipScreen` | `gems`, `perks`, `hotBonus` |
| Khen thưởng & sa thải | `MOTIVATION`, `STAFF_ACTIONS` | `staff.js`, `sim.js` (`motivFactor`) | `screens.js → staffScreen`, ♥/mây trên đầu nhân viên (`sprites.js → drawMood`, gọi từ `view.js`) | `staff[].motiv`, `staff[].wage`, `staff[].praisedDay`, `partyDay` |
| Ghé thăm bất ngờ | `VISITS` | `events.js` (gọi từ `sim.js`), `main.js → showVisitResult` | nhân vật `drawVisitor` (`sprites.js`), băng `.visitbar` trên HUD | `visit`, `visitPlan`, `visitDay` |
| Quảng cáo có thưởng | `ADS` | `ads.js`, `main.js → watchAd()` | các nút ▶ màu xanh | `ads { day, gems }`, `records.adsWatched` |

- **Mỗi sáng** (`main.js → newMorning`): CV mới, 3 hợp đồng mới, đặt lại lượt quảng cáo trong ngày.
- **CV ảnh hưởng gameplay** (`cv.js`): Kỹ năng ×0,8–1,4 thu nhập và điểm dự án; Độ lười ×0,6–1,4 xác suất lười; Chịu áp lực ×1,4–0,6 áp lực mỗi lần bị quất; Sở thích quyết định 70% kiểu lười của người đó.
- **Dự án**: yêu cầu = sản lượng của đội cho nghề đó × số ngày × độ khó (0,4–0,7). Vì vậy với KPI tốt luôn làm kịp, KPI kém thì trễ. Hạn là hết ngày `deadline`; sang ngày mới mà chưa xong thì thất bại (trừ khi đã gia hạn bằng quảng cáo, chỉ được 1 lần mỗi dự án). Thất bại (trễ hạn hoặc tự huỷ) bị **phạt hợp đồng** bằng `PROJECT_PENALTY` = 40% giá trị hợp đồng (`projects.js → penaltyOf`), trừ tối đa số quỹ đang có (không để âm); mức phạt hiện trên từng hợp đồng, dự án đang làm, báo cáo tan ca và hộp xác nhận huỷ.
- **Nhận thưởng dự án**: làm xong thì `projects.finish` chuyển dự án sang `projects.reward` (chưa cộng gì) và hiện **popup thưởng** (`ui.showProjectReward`): cúp vàng, tên dự án, khách hàng, xong sớm mấy ngày, số tiền (đếm tăng dần; dự án chỉ trả tiền, không trả 💎). Game tạm dừng tới khi người chơi bấm **Nhận thưởng** (`projects.collect(g, 1)`) hoặc **Xem quảng cáo: nhận x2 tiền** (`collect(g, 2)`). Nút Back Android = nhận thưởng thường. Thoát game khi chưa nhận thì lần sau mở lại popup hiện lại. Ở thanh taskbar (bản PC) không có chỗ cho popup nên tiền được cộng luôn.
- **Động lực** (`e.motiv`, 0–100, mặc định 50): nhân với xác suất lười, 100 → ×0,6, 0 → ×1,4; mỗi bậc lương giảm thêm 12%. Động lực tự trôi về mức nền (50 + 10 × bậc lương) với tốc độ 0,08/giây. Mỗi lần bị bắt quả tang −2, bị quất oan −15, sau đình công tối đa còn 20. Sa thải làm người ở lại −8 động lực, +10 áp lực.
- **Mã nhân viên** (`e.id`) luôn duy nhất: khi tuyển dùng `nextStaffId()` (mã lớn nhất + 1), vì sau khi sa thải số người không còn bằng mã. Vị trí bàn là thứ tự trong mảng `g.staff`.
- **Ghé thăm bất ngờ** (`events.js`): mỗi sáng từ ngày 2 có 35% khả năng lên lịch 1 đoàn (`visitPlan`), đến vào khoảng 10:00–16:00 và ở lại 25 giây. Thanh tra thuế xét KPI trung bình ≥ 70% (+3💎, không đạt thì phạt 10% quỹ). Khách VIP xét KPI ≥ 80% (thưởng 1.500 đ × hệ số ngày). Thanh tra lao động luân phiên **đang nhìn** (3,5–5,5 giây) và **lơ đãng** (2–3,5 giây): quất lúc họ nhìn bị phạt 60 đ × hệ số ngày mỗi roi và mất phần thưởng; quất lúc họ lơ đãng thì không sao; trợ lý cũng chỉ dám quất khi họ lơ đãng. Không ai bị thấy quất thì +4💎. Đoàn còn ở lại lúc tan ca thì tổng kết luôn. `visitDay` đảm bảo mỗi ngày chỉ lên lịch 1 lần, tải lại trang không quay lại được.
- **Quảng cáo**: lúc quảng cáo đang hiện, mô phỏng tạm dừng (`adOpen`) và tắt tiếng. Chỉ trao thưởng khi `showRewarded()` trả về `true` (xem hết). Chi tiết tích hợp AdMob ở `docs/QUANG-CAO.md`.

## Đa ngôn ngữ

- Tiếng Việt là ngôn ngữ gốc: mọi chữ trong code viết bằng tiếng Việt và bọc trong `t()` (`main.js` import dưới tên `tr` vì `t` đã dùng cho thời gian). Biến chèn bằng `{tên}`: `t('Ngày {n}', { n: 3 })`.
- Từ điển các ngôn ngữ khác nằm trong `js/lang/<mã>.js` (hiện có `en.js`), dạng `{ 'câu tiếng Việt': 'bản dịch' }`. Thiếu câu nào thì hiện tiếng Việt.
- Chữ trong `config.js` (tên roi, thành tựu, CV…) vẫn để tiếng Việt và được dịch **lúc hiển thị** (`t(item.name)`).
- Lần mở đầu tiên tự chọn theo ngôn ngữ của máy (`vi` → Tiếng Việt, còn lại → English). Người chơi đổi trong **Thêm → Ngôn ngữ**; lựa chọn lưu ở `localStorage['seproi.lang']` (nằm ngoài save, nên "Chơi lại từ đầu" vẫn giữ ngôn ngữ). Đổi ngôn ngữ sẽ lưu game rồi tải lại trang để dựng lại toàn bộ giao diện.
- **Không đặt tên biến cục bộ là `t`** trong file có dùng `t()`: biến sẽ che hàm dịch, gây lỗi "Cannot access 't' before initialization".
