# Hiệu năng & lỗi đơ màn

## Bộ test

| Test | Lệnh | Kiểm tra gì |
|---|---|---|
| Đo hiệu năng | `node tools/perf/perf.cjs [cpu] [giây] [báo-cáo.md]` | Chơi game trên Chromium với **CPU chậm ×6** (giống máy Android rẻ tiền), mỗi kịch bản 20 giây: FPS, thời gian khung hình p95, tỉ lệ khung giật (> 50 ms), số lần **đơ** (> 250 ms không vẽ được khung nào), long task, bộ nhớ JS / số phần tử DOM / số listener **tăng thêm** (rò rỉ), thời gian JS mỗi giây. Thoát với mã 1 nếu có kịch bản vượt ngưỡng. |
| Kẹt màn hình | `node tools/perf/freeze.cjs` | Cố tình đưa game vào từng trạng thái "kẹt" (popup thưởng dự án biến mất, mini-game biến mất, ô Tạm dừng mất, báo cáo tan ca bị đóng mà không sang ngày) và kiểm tra game tự chạy lại trong vài giây; nhật ký lỗi, đồng hồ FPS, nút gửi báo lỗi. |

Chạy trước: `node serve.cjs &` (game ở cổng 5566).

### Các kịch bản đo
1. **Ngày đầu**: 3 nhân viên, 1 phòng.
2. **Công ty lớn**: 6 phòng × 8 người (48 nhân viên), mọi phòng đủ máy cà phê, trợ lý, nội thất, đang xem 1 phòng.
3. **Toàn cảnh toà nhà** 6 phòng.
4. **Nhiều người lười + quất liên tục**: cứ 0,35 giây có người lười và bị quất (chữ bay, hiệu ứng, âm thanh).
5. **Mở / đóng các bảng liên tục**: 4 lần/giây mở rồi đóng CV, Dự án, Kim cương, Thành tựu, Nhân sự, Màn chơi, Kho đồ, Phòng ban, Toà nhà, Thêm, thỉnh thoảng chuyển phòng.

Ngưỡng đạt: ≥ 45 fps · p95 ≤ 40 ms · khung giật ≤ 5% · không đơ > 250 ms · heap tăng ≤ 8 MB · DOM tăng ≤ 300 · listener tăng ≤ 100.

## Kết quả (CPU ×6, 15 giây/kịch bản)

| Kịch bản | Trước (1.0.7) | Sau sửa |
|---|---|---|
| Ngày đầu | 60 fps · p95 16,7 ms | 60 fps · p95 16,7 ms · JS 201 → 170 ms/s |
| Công ty lớn, 48 người | 55,5 fps · **p95 33,3 ms** · JS 376 ms/s | 58,4 fps · **p95 16,8 ms** · JS 290 ms/s |
| Toàn cảnh toà nhà | 59,9 fps · JS 214 ms/s | 60 fps · JS 192 ms/s |
| Quất liên tục | **47,1 fps** · 5 long task | 54,0 fps · 2 long task |
| Mở / đóng bảng | 47,6 fps · **2 lần đơ, lâu nhất 450 ms** · 17 long task | 52,7 fps · **0 lần đơ**, lâu nhất 217 ms |

Không có rò rỉ: sau khi dọn rác, bộ nhớ JS tăng < 1 MB, DOM và listener không tăng theo thời gian.

Thời gian mở từng bảng (CPU ×6): Nhân sự **246 → 100 ms**, Thành tựu **196 → 113 ms**, các bảng khác 17–52 ms. Lưu game: 2,4 ms (công ty 48 người, save 26 KB).

## Nguyên nhân đã tìm thấy & cách sửa

| Nguyên nhân | Sửa |
|---|---|
| Mỗi khung hình vẽ lại **toàn bộ** sàn gạch, tường, cửa sổ, chậu cây, vách ngăn từng bàn (hàng nghìn lệnh vẽ, ~20% CPU) | Phần không chuyển động được vẽ **một lần** vào lớp đệm (`portrait.js → background`), chỉ vẽ lại khi phòng, nội thất, màu trời hoặc chỗ ngồi đổi |
| Toàn cảnh toà nhà: ô "+" xây phòng vẽ ~2.500 điểm ảnh mỗi khung, bầu trời + nhà xa vẽ lại liên tục | Hai lớp đệm `sky` và `frame` (`building.js → layer`) |
| Mỗi 0,1 giây đo lại kích thước giao diện (`getComputedStyle`, `offsetHeight`), bắt trình duyệt tính lại bố cục | Chỉ đo khi có thứ thật sự đổi kích thước (`ResizeObserver`) |
| Bảng dài (48 thẻ nhân viên, 53 thành tựu) dựng và vẽ cả những thẻ ngoài màn hình | `content-visibility: auto` (chỉ vẽ thẻ đang thấy), ảnh giải mã bất đồng bộ |
| **Đơ hẳn**: quảng cáo có thưởng chờ SDK/mạng/biểu mẫu đồng ý mãi không trả lời, game tạm dừng vĩnh viễn | Giới hạn thời gian: khởi tạo 8 giây, tải 12 giây, hiện tối đa 90 giây (`ads.js → AD_LIMITS`) |
| **Đơ hẳn**: game đang chờ một popup đã biến mất (thưởng dự án, mini-game, ô Tạm dừng, báo cáo tan ca) | **Watchdog** (`main.js → watchdog`) mỗi 2 giây: trạng thái chờ mà không còn popup tương ứng 2 lần liền thì tự gỡ và ghi nhật ký |

## Công cụ cho người test

Trong game: **Thêm → Hỗ trợ**
- **Hiện FPS**: đồng hồ nhỏ góc trên trái (FPS, khung lâu nhất trong 1 giây). Khi thấy giật, chụp màn hình kèm đồng hồ này.
- **Gửi báo lỗi**: mở bảng chia sẻ của điện thoại với nội dung gồm phiên bản, máy, kích thước màn hình, số nhân CPU, RAM, FPS hiện tại, trạng thái game, và **nhật ký**: lỗi JavaScript, các lần đơ > 1 giây (khung hình bị chặn khi app đang mở), các lần watchdog phải gỡ kẹt. Người test chỉ cần gửi đoạn này qua Zalo/Messenger/email. Nhật ký chỉ nằm trên máy, không tự gửi đi đâu.

### Hướng dẫn người test khi gặp đơ
1. Ghi lại: đang làm gì (mở bảng nào, có quảng cáo không, đang ở phòng nào, có bao nhiêu nhân viên).
2. Nếu game chạy lại được: vào **Thêm → Gửi báo lỗi** và gửi.
3. Nếu game đứng hẳn: đợi 5 giây (watchdog tự gỡ phần lớn trường hợp). Vẫn đứng thì thoát app, mở lại, rồi **Gửi báo lỗi** (nhật ký vẫn còn).
