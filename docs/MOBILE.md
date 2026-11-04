# Bản mobile (Android / iOS)

App dùng **Capacitor 8**: mã nguồn game (`js/`, `css/`, `fonts/`, `index.html` ở thư mục gốc) được đóng gói vào app Android/iOS native, và chạy trong WebView của hệ điều hành. Không có code game riêng cho từng nền tảng: sửa ở `js/` thì cả app mobile lẫn bản PC (`desktop/`) đều nhận thay đổi.

```
mobile/
├── package.json            scripts npm + phiên bản Capacitor/plugin
├── capacitor.config.json   appId, tên app, màu nền, cấu hình Splash/StatusBar
├── scripts/
│   └── copy-web.cjs        chép game (../index.html, css, js, fonts) vào www/
├── assets/                 ảnh nguồn cho @capacitor/assets (do ../tools/brand/make-brand.cjs sinh ra)
├── android/                project Android Studio (đã commit, sửa được)
├── ios/                    project Xcode (đã commit, sửa được, dùng Swift Package Manager)
└── www/                    bản copy của game, tự sinh, KHÔNG commit
```

## Khác biệt so với bản PC

| Hạng mục | Trên mobile |
|---|---|
| Chế độ chơi | Luôn ở "Văn phòng". Chế độ taskbar mini và "Ghim nổi" (PiP) bị ẩn. |
| Bố cục | **Màn dọc.** Trên cùng là thẻ thông tin (tiền + thu nhập/giây, ngày + giờ, KPI, roi đang dùng, combo, trợ lý). Giữa là văn phòng. Dưới là dòng gợi ý cho người mới, nút lớn "Cà phê sốc", và thanh tab 4 nút có icon (Quản lý · Nội thất · Áp lực · Âm). Bảng Quản lý trượt lên từ đáy (bottom sheet). |
| Văn phòng | Cảnh vẽ riêng cho màn dọc (`js/portrait.js`): bức tường có cửa sổ, đồng hồ, máy cà phê, trợ lý và nội thất; bên dưới là lưới ô làm việc, mỗi nhân viên một ô nhìn từ sau lưng, thấy rõ màn hình họ đang xem. **Chạm vào ô của ai là quất người đó.** Ô trống có dấu "+", chạm vào để tuyển người. Lưới có 2 cột (4 bàn), 3 cột (6 bàn), 3 hoặc 4 cột (8 bàn); phóng theo bước 5% (`view.fineScale`). Màn hình thấp (≤ 720 px, ví dụ iPhone SE) dùng giao diện gọn hơn để văn phòng không bị nhỏ. |
| Cảm ứng | Chạm để quất. Vùng trúng rộng thêm `TUNING.touchSlop` (7 px) vì ngón tay kém chính xác hơn chuột. Nút cao tối thiểu 44 px. |
| Rung | Plugin Haptics: quất trúng (combo ≥ 3 thì rung mạnh), quất oan, đình công, mua đồ, cà phê. |
| Tai thỏ / viền | Có padding theo vùng an toàn: iOS dùng `env(safe-area-inset-*)`, Android dùng biến `--safe-area-inset-*` do Capacitor 8 bơm vào. Cả hai được gộp vào `--sa-*` trong `style.css`. |
| Toàn màn hình | Android: chế độ immersive (ẩn status bar và thanh điều hướng, vuốt từ mép để hiện tạm). iOS: ẩn status bar. |
| Hướng màn hình | Khóa dọc (`portrait` trên Android, Portrait trên iOS). Riêng Android 16 trở lên, trên máy tính bảng và máy gập, hệ điều hành bỏ qua khóa xoay; khi máy nằm ngang, game tự chuyển sang bố cục ngang dự phòng (hai nhóm điều khiển thành hai cột bên cạnh văn phòng). |
| Nút Back Android | Đóng hộp thoại hoặc panel đang mở. Nếu không có gì mở thì hiện ô **Tạm dừng**; bấm Back thêm lần nữa trên ô đó thì đưa app xuống nền (không thoát). |
| Ra/vào app | Khi app xuống nền (về màn hình chính, chuyển app, tắt màn hình), game **đứng yên hoàn toàn** và được lưu lại. Khi quay lại sẽ thấy ô **Tạm dừng** (ngày, giờ, quỹ); bấm **Tiếp tục** thì chạy lại. Ô Tạm dừng nằm ở lớp riêng, nên bảng đang mở bên dưới vẫn được giữ. (Bản PC không tạm dừng mà bù tối đa `TUNING.awayCap` = 300 giây thời gian vắng, vì chế độ taskbar cần chạy nền.) |
| Màn hình tiêu đề | Mở app là thấy màn tiêu đề (`js/title.js`): nền thành phố về đêm có sao, đèn cửa sổ nhấp nháy, xu rơi; logo ông sếp quất roi; chữ **WHIP BOSS**; nút lớn **Bắt đầu** (game mới) hoặc **Chơi tiếp** (kèm ngày và quỹ hiện tại); ba nút Âm thanh, Nhạc, Ngôn ngữ. Văn phòng đứng yên cho tới khi bấm nút. Khi kiểm thử tự động, thêm `?title=0` vào URL để bỏ qua màn này. |
| Hướng dẫn lần đầu | Game mới: sau khi bấm Bắt đầu, **Trợ lý Hạnh** dẫn từng bước (`js/tutorial.js`). Các bước: chào sếp → quất nhân viên đang chơi game (vùng sáng + ngón tay, chạm ngoài vùng bị chặn) → cảnh báo quất oan → nhận vốn 500 đ → mở Quản lý và mua Roi Da Bò → mở Dự án và nhận 1 hợp đồng → quà +10 💎. Game đứng yên trong lúc hướng dẫn. Có nút **Bỏ qua** (vẫn nhận vốn và quà). Save cũ không bị hiện lại. Mỗi sáng có băng rôn **NGÀY N**. Kiểm thử tự động: thêm `?tutorial=0`. |
| Thanh tab | 6 tab trên 1 hàng: Quản lý · Dự án · Màn chơi · Kim cương · Thành tựu · Thêm. Góc trên bên trái là ảnh đại diện sếp (mặc trang phục đang lắp), bấm vào mở Hồ sơ sếp (trang phục + kỹ năng). |
| Toà nhà | Dưới văn phòng có thanh phòng: nút **Toà nhà** (xem toàn cảnh mặt cắt, nhấp nháy đỏ khi phòng khác có chuyện), ◀ tên phòng · số người · KPI ▶. Ở toàn cảnh chạm vào phòng để vào, chạm ô **+** để xây phòng mới. Nút Back Android khi đang trong phòng (có từ 2 phòng) đưa về toàn cảnh. |
| Chia sẻ | Plugin `@capacitor/share` 8.0.3 + `@capacitor/filesystem` 8.1.4: ảnh được ghi vào bộ nhớ đệm của app rồi mở bảng chia sẻ của Android/iOS (không cần quyền truy cập bộ nhớ). |
| Nhạc nền | Nhạc 8-bit tự tổng hợp (`js/music.js`, không có file âm thanh): một bài cho màn tiêu đề và một bài vui nhộn khi làm việc. Tắt/bật bằng nút "Nhạc" ở màn tiêu đề hoặc mục **Thêm → Tắt nhạc nền** (lưu trong save, `g.musicOff`). Nhạc đi qua cùng kênh tổng với hiệu ứng, nên nút ♪ tắt âm thanh và lúc xem quảng cáo đều tắt luôn nhạc. Nhạc dừng khi app xuống nền hoặc đang hiện ô Tạm dừng. Bản PC (taskbar) không phát nhạc. |
| Hộp thoại dài | Tiêu đề và nút × được cố định (`position: sticky`); chỉ phần nội dung bên dưới cuộn. Cửa hàng Kim cương hiện số 💎 trên tiêu đề. |
| Lưu game | Vẫn dùng `localStorage`, có thêm bản sao trong **Capacitor Preferences** (SharedPreferences / UserDefaults). Nếu hệ điều hành xóa dữ liệu WebView, game tự khôi phục từ bản sao. |

## Yêu cầu

- Node.js ≥ 22.
- **Android**: Android Studio (bản mới, có SDK 36) và JDK 21 (đi kèm Android Studio).
- **iOS**: máy Mac có Xcode 26 trở lên. Muốn cài lên iPhone thật hoặc đưa lên App Store thì cần tài khoản Apple Developer.

## Quy trình phát triển hằng ngày

```bash
cd mobile
```

```bash
npm install
```

Sửa game ở `../js`, `../css`… rồi đồng bộ vào project native:

```bash
npm run sync
```

`sync` = `copy-web.cjs` (chép game vào `www/`) + `cap sync` (chép `www/` vào android/ios và cập nhật plugin). **Phải chạy lại sau mỗi lần sửa code web** thì app mới nhận thay đổi.

Xem thử nhanh trên máy tính khi đang sửa code (không cần build; không có rung và plugin native):

```bash
node ../serve.cjs
```

Mở http://localhost:5566/?shell=mobile và bật chế độ giả lập thiết bị trong Chrome DevTools (Ctrl+Shift+M), chọn một điện thoại (màn dọc).

### Android

```bash
npm run android
```

Lệnh này mở Android Studio, sau đó bấm ▶ Run. Muốn cài thẳng lên máy/emulator đang cắm:

```bash
npm run run:android
```

Build file APK debug bằng dòng lệnh (file ra ở `android/app/build/outputs/apk/debug/app-debug.apk`):

```bash
npm run apk
```

**Không cài Android Studio?** Workflow `.github/workflows/android.yml` tự build APK mỗi khi push thay đổi ở `js/`, `css/`, `fonts/`, `mobile/`… Vào tab **Actions** trên GitHub → lần chạy "Android build" → phần **Artifacts** → tải `sep-roi-debug-apk`, giải nén rồi cài lên điện thoại (cần cho phép "cài ứng dụng không rõ nguồn gốc").

### iOS (trên Mac)

```bash
npm run ios
```

Trong Xcode: chọn target **App** → *Signing & Capabilities* → chọn Team (Apple ID của bạn). Sau đó chọn iPhone hoặc simulator và bấm ▶. Project dùng Swift Package Manager nên không cần CocoaPods.

## Gỡ lỗi trên máy thật

- **Android**: bật `"webContentsDebuggingEnabled": true` trong `capacitor.config.json` (nhớ tắt lại trước khi phát hành), chạy `npm run sync`, cắm máy rồi mở `chrome://inspect` trên Chrome máy tính.
- **iOS**: bản debug cho phép Safari → menu Develop → [tên iPhone] → Whip Boss.
- Trong console có `window.__game` (`g` = state, `view`, `whip`). Ví dụ, để có tiền thử nghiệm: `__game.g.money = 99999`.
- Xem log native: `npx cap run android` hoặc Logcat trong Android Studio; Xcode console cho iOS.

## Icon và màn hình chờ

Mọi hình ảnh nhận diện của game đều vẽ từ **một nguồn duy nhất**: hàm `drawLogo()` trong `js/brand.js` (ông sếp đeo kính đen quất roi vàng, pixel art lưới 32x32) và `drawTitle()` (chữ "WHIP BOSS" pixel). Màn hình tiêu đề trong game cũng dùng đúng hai hàm này. Script `tools/brand/make-brand.cjs` vẽ lại bằng Node (không cần thư viện ảnh) và ghi ra:

| File | Dùng cho |
|---|---|
| `icon.svg` | favicon (bản web / PC) |
| `desktop/build/icon.ico`, `icon.png` | icon app Windows / macOS |
| `mobile/assets/icon-only.png`, `icon-foreground.png`, `icon-background.png` | icon Android (gồm adaptive icon: ông sếp đặt thấp để vai chạy ra mép mặt nạ tròn) và iOS |
| `mobile/assets/splash.png`, `splash-dark.png` | màn hình chờ |
| `tools/brand/out/icon-512.png` | icon 512x512 cho Google Play (không commit) |
| `tools/brand/out/feature-1024x500.png` | ảnh nổi bật (feature graphic) cho Google Play (không commit) |

```bash
npm run icons
```

Lệnh này sinh lại `assets/*.png`, rồi `@capacitor/assets` ghi đè toàn bộ icon/splash trong `android/` và `ios/`.

Sửa logo: chỉnh `drawLogo()` trong `js/brand.js` rồi chạy lại `npm run icons` (mobile) và `npm run icon` (desktop). Muốn dùng ảnh do họa sĩ vẽ: đặt ảnh vào `assets/` (`icon-only.png` 1024², `icon-foreground.png` 1024² nền trong suốt, `icon-background.png`, `splash.png` và `splash-dark.png` 2732²), rồi chỉ chạy phần `capacitor-assets generate …` trong script `icons` (bỏ bước `make-brand.cjs` để không ghi đè ảnh của bạn).

## Phát hành

### Đổi phiên bản

- Android: `android/app/build.gradle` → `versionCode` (số nguyên, **mỗi lần upload phải tăng**) và `versionName` (ví dụ `1.1.0`).
- iOS: Xcode → target App → General → *Version* và *Build*.
- Nên cập nhật cả `mobile/package.json` và `desktop/package.json` cho đồng bộ.

### Android: ký app và đưa lên Google Play

1. Tạo keystore một lần duy nhất. **Giữ kỹ file này và mật khẩu**: mất nó thì không cập nhật được app trên Play nữa.

   ```bash
   keytool -genkey -v -keystore mobile/android/whipboss-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias whipboss
   ```

2. Tạo `mobile/android/keystore.properties` (đã nằm trong `.gitignore`, không commit):

   ```properties
   storeFile=../whipboss-upload.jks
   storePassword=MẬT_KHẨU
   keyAlias=whipboss
   keyPassword=MẬT_KHẨU
   ```

3. Build file AAB (ra ở `android/app/build/outputs/bundle/release/app-release.aab`), rồi upload lên Google Play Console:

   ```bash
   npm run aab
   ```

**Cách không cần cài Android Studio (đang dùng):** mỗi lần push, GitHub Actions build sẵn file `WhipBoss-release-unsigned.aab` và gắn vào release `apk-latest` (cạnh file APK). Bạn chỉ cần ký nó bằng upload key trên máy mình (cần Java/JDK, có sẵn lệnh `jarsigner`):

```bash
jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore whipboss-upload.jks WhipBoss-release-unsigned.aab whipboss
```

Rồi đổi tên (ví dụ `WhipBoss-1.0.1.aab`) và upload lên Play Console. Trước mỗi lần upload bản mới, nhớ tăng `versionCode` (và `versionName`) trong `android/app/build.gradle` rồi push, đợi Actions build xong mới tải file `.aab`.

Muốn GitHub Actions ký luôn: thêm các secret `ANDROID_KEYSTORE_BASE64` (giá trị là output của `base64 -w0 whipboss-upload.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Khi đó release sẽ có sẵn `WhipBoss-release.aab` đã ký.

Google Play bắt buộc **Play App Signing** cho app mới: Google giữ khóa ký thật, còn khóa của bạn chỉ là *upload key*. Nếu lỡ mất upload key, có thể xin Google đặt lại trong Play Console (Cài đặt → Tính toàn vẹn của ứng dụng), nhưng mất vài ngày.

### iOS: TestFlight / App Store

Trong Xcode chọn thiết bị *Any iOS Device* → Product → **Archive** → Distribute App → App Store Connect. Sau đó vào App Store Connect để gửi TestFlight hoặc gửi duyệt.

### Lưu ý khi đưa lên store

- Nội dung game là hài hước châm biếm nhưng có cảnh "quất" nhân viên. Khi khai báo phân loại độ tuổi (IARC trên Google Play, Age Rating trên App Store), hãy chọn đúng mục bạo lực hoạt hình/hài hước để tránh bị từ chối.
- Game không thu thập dữ liệu, không có quảng cáo, không gọi mạng: phần khai báo Data safety / Privacy Nutrition Label chọn "Không thu thập dữ liệu". Nếu sau này thêm analytics hoặc quảng cáo thì phải khai báo lại.
- **Chính sách quyền riêng tư** (bắt buộc): trang `docs/privacy.html`, đăng bằng GitHub Pages tại https://toankunsss.github.io/Seproi/privacy.html (bật một lần: repo → Settings → Pages → Source *Deploy from a branch* → chọn nhánh chứa code, thư mục `/docs` → Save). Trong game có link ở menu **Thêm** và cuối màn tiêu đề (`PRIVACY_URL` trong `config.js`). Khi thêm quảng cáo thật hay analytics phải sửa lại trang này.
- `appId` là `com.whipboss.game` (trùng với bản desktop). Sau lần upload đầu tiên lên Google Play thì **không đổi được nữa**.

## Thêm plugin native mới

Ví dụ thêm plugin Share:

```bash
npm install @capacitor/share
```

```bash
npx cap sync
```

Game không dùng bundler, nên **không `import` package npm trong `js/`**. Thay vào đó, gọi plugin qua proxy của Capacitor trong `js/platform.js`:

```js
const Share = plugin('Share');           // null nếu không chạy trong app hoặc chưa cài plugin
if (Share) await Share.share({ title: 'Whip Boss', text: 'Mình vừa đạt combo x12!' });
```

`plugin(name)` dùng `Capacitor.registerPlugin`, có sẵn nhờ `www/capacitor.js` (bản build sẵn của `@capacitor/core`, do `copy-web.cjs` chép vào). `plugin()` trả về `null` khi xem thử bằng trình duyệt hoặc trong bản PC, nên luôn kiểm tra `null` trước khi gọi.

## Xử lý sự cố

| Triệu chứng | Cách xử lý |
|---|---|
| App không nhận code mới | Chạy lại `npm run sync`. Trên Android Studio có thể cần Build → Clean Project. |
| Màn hình chờ hiện 2 giây rồi chỉ thấy nền tối, không có game | Bật gỡ lỗi WebView (xem phần trên) và đọc lỗi trong console. Thường do lỗi cú pháp JS, vì module ES lỗi thì cả game dừng. |
| `SDK location not found` | Mở `android/` bằng Android Studio một lần, hoặc tạo `android/local.properties` chứa `sdk.dir=/đường/dẫn/Android/sdk`. |
| Không rung | Android: kiểm tra chế độ rung/haptic của máy. iOS: iPhone ở chế độ im lặng hoặc tiết kiệm pin có thể tắt haptic. Khi xem thử bằng trình duyệt (`?shell=mobile`) thì không có rung. |
| Không có tiếng | Âm thanh dùng Web Audio và chỉ bật sau lần chạm đầu tiên. Trên iOS, gạt công tắc im lặng sẽ tắt âm WebView. |
| Mất save | Save nằm trong `localStorage` của WebView, kèm bản sao trong Preferences. Gỡ app thì mất cả hai. Đổi `appId` thì được coi là app khác. |
