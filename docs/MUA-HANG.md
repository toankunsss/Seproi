# Mua trong ứng dụng: VIP & kim cương (Google Play Billing)

Từ bản 1.0.9 game bán hai loại hàng bằng tiền thật, qua plugin `@capgo/native-purchases` 8.9.16 (Google Play Billing Library 9.1). Toàn bộ logic nằm trong `js/billing.js`, mã sản phẩm trong `IAP` (`js/config.js`).

| Loại | Mã sản phẩm (Play Console) | Nội dung | Giá gợi ý |
|---|---|---|---|
| Gói đăng ký | `whipboss_vip`, gói cơ sở `monthly` (tự gia hạn, 1 tháng) | **Whip Boss VIP**: không quảng cáo tự động · bấm "xem quảng cáo" là nhận thưởng ngay · +30 💎 mỗi ngày · khung VIP cho ảnh sếp | 49.000 ₫/tháng |
| Sản phẩm một lần (tiêu hao) | `gems_200` | 200 💎 | 25.000 ₫ |
| Sản phẩm một lần (tiêu hao) | `gems_700` | 700 💎 (+17%) | 79.000 ₫ |
| Sản phẩm một lần (tiêu hao) | `gems_2000` | 2.000 💎 (+33%) | 199.000 ₫ |

Giá **chỉ đặt trong Play Console**; game hiển thị giá Google trả về theo tiền tệ của người chơi, không ghi cứng giá nào. Đổi quyền lợi VIP: `IAP.vipDailyGems` (config) và các chỗ gọi `billing.isVip(g)` trong `main.js`.

## Thiết lập trên Play Console (làm một lần)

1. **Hồ sơ thanh toán (Merchant)**: Play Console → **Thiết lập → Hồ sơ thanh toán** → tạo hồ sơ (tên, địa chỉ, tài khoản ngân hàng nhận tiền). Chưa có thì không tạo được sản phẩm.
2. **Tải lên một bản có quyền BILLING** trước (bản 1.0.9 trở lên). Play Console chỉ cho tạo sản phẩm khi đã có một bản chứa thư viện thanh toán ở bất kỳ kênh nào (thử nghiệm khép kín là đủ).
3. **Gói đăng ký**: **Kiếm tiền bằng sản phẩm → Gói thuê bao → Tạo gói thuê bao**
   - Mã sản phẩm: `whipboss_vip` · Tên: *Whip Boss VIP*
   - Thêm **gói cơ sở**: mã `monthly`, **Tự động gia hạn**, chu kỳ **1 tháng**, đặt giá (Play tự quy đổi cho các nước khác), **Kích hoạt**.
   - (Tuỳ chọn) Ưu đãi dùng thử 3 ngày miễn phí: tạo **Ưu đãi** trong gói cơ sở `monthly`, game tự dùng ưu đãi Google trả về.
4. **Gói kim cương**: **Kiếm tiền bằng sản phẩm → Sản phẩm trong ứng dụng → Tạo sản phẩm** cho từng mã `gems_200`, `gems_700`, `gems_2000` (tên, mô tả, giá) → **Kích hoạt**.
5. **Người kiểm thử giấy phép** (mua thử không mất tiền): Play Console (trang chủ, không phải trong app) → **Thiết lập → Kiểm thử giấy phép** → thêm Gmail của bạn và người test, phản hồi giấy phép `RESPOND_NORMALLY`. Các tài khoản này thấy "Thẻ thử nghiệm, luôn phê duyệt" khi thanh toán; gói đăng ký thử gia hạn nhanh (5 phút = 1 tháng).
6. **Nội dung ứng dụng → Mua hàng trong ứng dụng**: khai **Có**. Phần **An toàn dữ liệu**: game không tự thu thập dữ liệu mua hàng (Google Play xử lý); nếu biểu mẫu hỏi "Lịch sử mua hàng", trả lời là không thu thập bởi ứng dụng.

## Hoạt động thế nào (`js/billing.js`)

- **Mở game** → `initBilling`: lấy giá, hỏi Google Play tài khoản đang có gói VIP không (`getPurchases('subs')`), và cộng những gói kim cương đã trả tiền mà game chưa cộng (app bị tắt giữa chừng, thanh toán chờ duyệt như chuyển khoản), rồi `consumePurchase` để mua lại được.
- **Mỗi giao dịch kim cương chỉ cộng một lần** (mã `purchaseToken` lưu trong `g.iap.tokens`).
- **VIP khi không có mạng**: vẫn giữ VIP trong `IAP.graceDays` = 3 ngày kể từ lần hỏi Google Play thành công gần nhất.
- **Huỷ / hết hạn**: Google Play không trả gói về nữa → lần mở game sau VIP tắt. Người chơi huỷ ở **Google Play → Thanh toán và gói đăng ký**, hoặc nút **Quản lý gói trên Google Play** trong cửa hàng.
- **Khôi phục giao dịch** (cửa hàng 💎): đổi máy / cài lại game → bấm để lấy lại VIP. Kim cương đã cộng nằm trong save (có bản sao trong Preferences).
- **Bán công ty** giữ nguyên VIP, kim cương, đặc quyền 💎, skin và thú cưng đã mua.
- **Không có máy chủ**: game tin kết quả Google Play trả về trên máy. Muốn chống gian lận chặt hơn thì cần một máy chủ xác minh `purchaseToken` qua Google Play Developer API (chưa làm).
- **Trình duyệt / kiểm thử**: không có Google Play nên dùng cửa hàng giả lập (trên `localhost` hoặc thêm `?iap=sim`): giá mẫu, hộp xác nhận thay cho trang thanh toán. Test tự động: `node tools/perf/iap.cjs`.
