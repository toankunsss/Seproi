# Sếp Roi

Game mobile idle văn phòng pixel-art cho **Android và iOS**. Bạn là sếp; nhân viên lén chơi game, lướt Tóp Tóp, ngủ gật, xem coin… Chạm vào kẻ đang lười để quất họ quay lại làm việc, giữ KPI, kiếm tiền, nâng cấp roi, tuyển thêm người và mở rộng văn phòng. Quất oan người đang làm thì bị phạt, và họ có thể đình công.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `js/`, `css/`, `fonts/`, `index.html` | mã nguồn game (logic, đồ họa vẽ bằng code, âm thanh tổng hợp, giao diện) |
| `mobile/` | **app mobile**: Capacitor 8, gồm project Android Studio (`mobile/android`) và Xcode (`mobile/ios`) |
| `desktop/` | bản PC phụ (Electron, thanh nhỏ nằm trên taskbar Windows/macOS), dùng chung mã nguồn game |
| `docs/` | tài liệu phát triển |

App mobile đóng gói mã nguồn game vào trong app native. Game chạy offline hoàn toàn, có rung (haptics), nút Back Android, toàn màn hình, khóa màn hình ngang, và có bản sao lưu save trong bộ nhớ native.

## Build app

Có Android Studio:

```bash
cd mobile
```

```bash
npm install
```

```bash
npm run android
```

**Không có Android Studio?** Mỗi lần push lên GitHub, workflow **Android build** tự build file APK. Vào tab Actions → chọn lần chạy → tải `sep-roi-debug-apk` → cài lên điện thoại.

iOS (cần máy Mac + Xcode): trong `mobile/`, chạy `npm run ios`.

Muốn xem nhanh giao diện điện thoại trên máy tính khi đang sửa code (không cần build), chạy `node serve.cjs` rồi mở http://localhost:5566/?shell=mobile và bật chế độ giả lập thiết bị (Ctrl+Shift+M) trong Chrome DevTools.

## Tài liệu

- [docs/MOBILE.md](docs/MOBILE.md): build, chạy, ký và phát hành Android/iOS, gỡ lỗi trên máy thật.
- [docs/KIEN-TRUC.md](docs/KIEN-TRUC.md): cấu trúc mã nguồn, vòng lặp game, lưu game, lớp nền tảng.
- [docs/PHAT-TRIEN.md](docs/PHAT-TRIEN.md): thêm nội dung (roi, nhân viên, nội thất…), cân bằng game, quy ước code, danh sách việc nên làm tiếp.
- [desktop/MACOS.md](desktop/MACOS.md): đóng gói bản PC cho macOS.
