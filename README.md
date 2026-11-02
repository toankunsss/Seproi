# Sếp Roi

Game idle văn phòng pixel-art: bạn là sếp, nhân viên lén chơi game, lướt Tóp Tóp, ngủ gật, xem coin… Bắt quả tang thì quất một roi để họ quay lại làm việc, giữ KPI, kiếm tiền, nâng cấp roi, tuyển thêm người và mở rộng văn phòng. Quất oan người đang làm thì bị phạt và họ có thể đình công.

Một mã nguồn web duy nhất (HTML + CSS + JavaScript ES modules, không cần bundler) chạy trên 4 nền tảng:

| Nền tảng | Thư mục | Cách đóng gói |
|---|---|---|
| Trình duyệt (PC + điện thoại, cài được dạng PWA) | thư mục gốc | file tĩnh + `sw.js` |
| Windows / macOS (thanh nhỏ nằm trên taskbar) | `desktop/` | Electron |
| **Android** | `mobile/android/` | Capacitor 8 |
| **iOS / iPadOS** | `mobile/ios/` | Capacitor 8 |

## Chạy nhanh

```bash
node serve.cjs
```

Mở http://localhost:5566. Muốn xem giao diện điện thoại trên máy tính: http://localhost:5566/?shell=mobile (hoặc bật chế độ giả lập thiết bị trong DevTools).

Bản Android (cần Android Studio):

```bash
cd mobile
```

```bash
npm install
```

```bash
npm run android
```

Không có Android Studio? Mỗi lần push lên GitHub, workflow **Android build** tự build file APK. Vào tab Actions → chọn lần chạy → tải `sep-roi-debug-apk`.

## Tài liệu

- [docs/MOBILE.md](docs/MOBILE.md): build, chạy, ký và phát hành Android/iOS, gỡ lỗi trên máy thật.
- [docs/KIEN-TRUC.md](docs/KIEN-TRUC.md): cấu trúc mã nguồn, vòng lặp game, lưu game, lớp nền tảng.
- [docs/PHAT-TRIEN.md](docs/PHAT-TRIEN.md): thêm nội dung (roi, nhân viên, nội thất…), cân bằng game, quy ước code, danh sách việc nên làm tiếp.
- [desktop/MACOS.md](desktop/MACOS.md): đóng gói bản macOS.
