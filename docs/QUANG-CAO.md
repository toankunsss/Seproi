# Quảng cáo có thưởng (AdMob)

Game chỉ gọi đúng một hàm: `showRewarded(placement)` trong `js/ads.js`. Hàm trả về `true` khi người chơi đã xem hết quảng cáo, và chỉ khi đó game mới trao thưởng. Hiện tại, khi app chưa cài AdMob, hàm hiện một **quảng cáo giả lập** 5 giây để bạn chơi thử và test toàn bộ luồng thưởng.

## Các điểm đặt quảng cáo

| Placement | Ở đâu | Thưởng | Giới hạn |
|---|---|---|---|
| `gems` | Cửa hàng Kim cương | +5 💎 (`ADS.gemsPerAd`) | 6 lượt/ngày (`ADS.gemAdsPerDay`) |
| `double` | Báo cáo tan ca | Nhận thêm đúng bằng doanh thu ngày | 1 lần/ngày |
| `extend` | Báo cáo tan ca / màn Dự án | Gia hạn dự án +1 ngày | 1 lần/dự án |
| `cv` | Màn Hồ sơ ứng viên | 3 CV mới | Không giới hạn |

Trong lúc quảng cáo hiện, game tạm dừng và tắt tiếng (`main.js → watchAd`). Đổi phần thưởng hay giới hạn thì sửa `ADS` trong `config.js` và các hàm `ad*` trong `main.js`.

## Nối AdMob thật

1. Tạo tài khoản AdMob, thêm app Android (và iOS nếu có), rồi tạo **ad unit dạng Rewarded**. Bạn sẽ có *App ID* (`ca-app-pub-…~…`) và *Ad unit ID* (`ca-app-pub-…/…`).
2. Cài plugin (bản 8 dành cho Capacitor 8):

   ```bash
   cd mobile
   ```

   ```bash
   npm install @capacitor-community/admob@8
   ```

   ```bash
   npx cap sync
   ```

3. Khai báo App ID:
   - Android, trong `mobile/android/app/src/main/AndroidManifest.xml`, bên trong `<application>`:
     ```xml
     <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-xxxxxxxx~yyyyyyyy"/>
     ```
   - iOS: thêm `GADApplicationIdentifier` (cùng giá trị) vào `mobile/ios/App/App/Info.plist`.
4. Điền Ad unit ID thật vào `AD_UNITS` trong `js/ads.js`. Các giá trị đang có sẵn là **ID test công khai của Google**: luôn hiện quảng cáo thử, an toàn khi phát triển.
5. `npm run sync`, cài lên máy thật và thử từng nút ▶. Khi có plugin, `ads.js` tự dùng AdMob (`AdMob.initialize → prepareRewardVideoAd → showRewardVideoAd`). Hãy kiểm tra trên máy thật rằng đóng quảng cáo giữa chừng thì **không** được thưởng; cách plugin báo việc này có thể khác giữa các phiên bản, nên chỉnh `showAdMob()` nếu cần.

## Bắt buộc trước khi phát hành

- **Không bao giờ bấm quảng cáo thật của chính mình.** Khi test, dùng ID test hoặc thêm máy của bạn làm *test device* trong AdMob.
- Có trang **chính sách quyền riêng tư** (privacy policy) và khai mục **Data safety** trên Google Play: AdMob thu thập mã quảng cáo (advertising ID).
- Hỏi đồng ý (consent) với người dùng châu Âu/Anh: AdMob có công cụ UMP, plugin hỗ trợ `requestConsentInfo` / `showConsentForm`.
- Khai báo phân loại độ tuổi đúng (có bạo lực hoạt hình), và không chọn đối tượng trẻ em.
