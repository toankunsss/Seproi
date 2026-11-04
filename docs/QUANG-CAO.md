# Quảng cáo có thưởng (AdMob)

Game chỉ gọi đúng một hàm: `showRewarded(placement)` trong `js/ads.js`. Hàm trả về `true` khi người chơi đã xem hết quảng cáo, và chỉ khi đó game mới trao thưởng.

- **App điện thoại (từ bản 1.0.2):** dùng **Google AdMob** thật qua plugin `@capacitor-community/admob` 8.2.1.
  - App ID `ca-app-pub-2932189263098274~2788968291` (khai trong `AndroidManifest.xml`).
  - Đơn vị quảng cáo *Có tặng thưởng* `reward_main` = `ca-app-pub-2932189263098274/9932749113` (`AD_UNITS` trong `js/ads.js`).
- **Trình duyệt / bản PC:** không có AdMob, nên hiện **quảng cáo giả lập** 5 giây để chơi thử và test luồng thưởng.

## Các điểm đặt quảng cáo

| Placement | Ở đâu | Thưởng | Giới hạn |
|---|---|---|---|
| `gems` | Cửa hàng Kim cương | +5 💎 (`ADS.gemsPerAd`) | 6 lượt/ngày (`ADS.gemAdsPerDay`) |
| `double` | Báo cáo tan ca | +50% doanh thu ngày (không tính tiền dự án) | 1 lần/ngày |
| `extend` | Báo cáo tan ca / màn Dự án | Gia hạn dự án +1 ngày | 1 lần/dự án |
| `cv` | Màn Hồ sơ ứng viên | 3 CV mới | Không giới hạn |
| `projectDouble` | Popup hoàn thành dự án | x2 tiền dự án | 1 lần/dự án |
| `offlineDouble` | Popup "Trong lúc Sếp vắng mặt" | x2 thu nhập khi vắng mặt | 1 lần/lần quay lại |
| `loginDouble` | Quà đăng nhập hằng ngày | x2 quà hôm nay | 1 lần/ngày |

Trong lúc quảng cáo hiện, game tạm dừng và tắt tiếng (`main.js → watchAd`). Đổi phần thưởng hay giới hạn thì sửa `ADS` trong `config.js` và các hàm `ad*` trong `main.js`.

## Quảng cáo tự động (xen kẽ / interstitial)

Từ bản 1.0.7, ngoài quảng cáo có thưởng, game tự hiện **quảng cáo toàn màn hình** ở những chỗ nghỉ tự nhiên, người chơi không phải bấm gì (`main.js → maybeInterstitial`, `ads.js → showInterstitial`):

| Chỗ hiện | Khi nào |
|---|---|
| `nextDay` | Bấm **Ngày làm việc mới** trên báo cáo tan ca, trước khi ngày mới bắt đầu |
| `level` | Bấm **Về công ty / Màn tiếp / Chơi lại** sau khi kết thúc một màn Chiến dịch |

Nhịp hiện (`ADS.interstitial` trong `config.js`):
- Tối đa **3 lần mỗi ngày** (theo lịch thật), cách nhau ít nhất **5 phút**.
- Không hiện cho người mới (trước ngày 3 trong game), trong 2 phút đầu sau khi mở app, hay trong 3 phút sau khi người chơi vừa tự xem quảng cáo có thưởng.
- Không hiện khi đang hướng dẫn lần đầu hoặc ở chế độ taskbar.
- Nếu quảng cáo chưa tải xong thì bỏ qua, không bắt người chơi chờ.
- Người chơi mua đặc quyền 💎 **Văn phòng không quảng cáo** (500 💎, giữ cả khi bán công ty) thì không bao giờ thấy quảng cáo tự động. Quảng cáo có thưởng vẫn dùng được.

Trong lúc quảng cáo hiện, game tạm dừng và tắt tiếng. Trên trình duyệt không có quảng cáo tự động; thêm `?inter=sim` vào URL để thấy bản giả lập 3 giây khi kiểm thử.

**Cần làm trên AdMob:** vào app Whip Boss → **Đơn vị quảng cáo → Thêm → Quảng cáo xen kẽ (Interstitial)**, đặt tên ví dụ `inter_main`, rồi thay mã đơn vị vào `AD_UNITS.android.interstitial` trong `js/ads.js`. Khi chưa thay, game dùng mã thử của Google (hiện quảng cáo thử, không có doanh thu).

## AdMob hoạt động thế nào (`js/ads.js`)

1. Mở app → `initAds()`:
   - Hỏi plugin nội bộ `BuildInfo` (`BuildInfoPlugin.java`) xem đây là bản debug hay bản phát hành.
   - Hiện biểu mẫu đồng ý của Google (UMP) nếu luật yêu cầu (EEA/UK/Thuỵ Sĩ).
   - Khởi tạo AdMob và tải sẵn 1 quảng cáo.
2. **Bản debug** (APK thử nghiệm ở release `apk-latest`) luôn xin **quảng cáo thử** (`isTesting: true`), nên bạn bấm thoải mái. Chỉ **bản phát hành** (.aab lên CH Play) mới dùng đơn vị quảng cáo thật.
3. Người chơi bấm nút ▶: hiện quảng cáo đã tải sẵn. Thưởng được quyết định bằng sự kiện `onRewardedVideoAdReward` / `onRewardedVideoAdDismissed`. Lý do: `showRewardVideoAd()` của plugin không bao giờ kết thúc nếu người chơi đóng sớm. Đóng sớm thì không có thưởng. Xem xong thì tải sẵn quảng cáo tiếp theo.
4. Không có quảng cáo (mất mạng, hết quảng cáo) thì game báo "Chưa có quảng cáo, thử lại sau ít phút." và không trừ gì.

iOS chưa có app AdMob: `Info.plist` đang để App ID mẫu của Google (`GADApplicationIdentifier`) và `AD_UNITS.ios` là đơn vị thử. Nhớ thay trước khi lên App Store.

## Sau khi phát hành chính thức

- Vào AdMob → app Whip Boss → **Liên kết với cửa hàng** (chọn app trên Google Play). AdMob duyệt app (vài ngày), sau đó quảng cáo thật mới chạy đầy đủ. Trước đó bản phát hành có thể ít hoặc không có quảng cáo.
- Nên thêm file `app-ads.txt` trên website nhà phát triển (khai ở trang cửa hàng Play) để tăng doanh thu.
- Thanh toán khi số dư đạt 100 USD; khai thông tin thuế và nhận mã PIN qua thư khi số dư đạt 10 USD.

## Bắt buộc trước khi phát hành

- **Không bao giờ bấm quảng cáo thật của chính mình.** Khi test, dùng ID test hoặc thêm máy của bạn làm *test device* trong AdMob.
- Có trang **chính sách quyền riêng tư** (`docs/privacy.html`, đã nêu AdMob) và khai mục **An toàn dữ liệu** trên Google Play. Các mục cần khai:
  - **Có** thu thập dữ liệu, có chia sẻ dữ liệu.
  - *Mã thiết bị hoặc mã khác* (Device or other IDs), *Vị trí gần đúng*, *Hoạt động trong ứng dụng / Tương tác*, *Hiệu suất ứng dụng / Chẩn đoán*.
  - Mục đích: Quảng cáo hoặc tiếp thị, Phân tích, Chống gian lận.
  - Dữ liệu được mã hoá khi truyền, không bắt buộc.
- Mục **Quảng cáo** trong Play Console: chọn **"Có, ứng dụng của tôi có chứa quảng cáo"**.
- Hỏi đồng ý (consent) với người dùng châu Âu/Anh: AdMob có công cụ UMP, plugin hỗ trợ `requestConsentInfo` / `showConsentForm`.
- Khai báo phân loại độ tuổi đúng (có bạo lực hoạt hình), và không chọn đối tượng trẻ em.
