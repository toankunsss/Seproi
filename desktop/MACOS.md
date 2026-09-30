# Cài đặt Sếp Roi trên macOS

## Tạo bộ cài

Chạy trên máy Mac có Node.js:

```bash
npm install
npm run icon
npm run dist:mac
```

Thư mục `dist/` sẽ chứa bản `.dmg` và `.zip` cho cả Intel (`x64`) và Apple Silicon (`arm64`).

## Cài đặt

1. Mở file `.dmg` đúng với loại chip của máy.
2. Kéo **Sếp Roi** vào thư mục **Applications**.
3. Mở game từ Applications.

Nếu bản build chưa được ký bằng chứng chỉ Apple Developer, macOS có thể chặn lần mở đầu tiên. Vào **System Settings → Privacy & Security** và chọn **Open Anyway**. Khi phát hành chính thức, nên cấu hình chứng chỉ Developer ID và notarization để bỏ cảnh báo này.

