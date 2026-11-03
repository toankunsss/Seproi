# Tài nguyên cho Google Play

| File | Dùng cho |
|---|---|
| `icon-512.png` | Biểu tượng ứng dụng (512x512) |
| `feature-1024x500.png` | Hình ảnh nổi bật (feature graphic) |
| `WhipBoss-promo-portrait.mp4` | Video giới thiệu dọc 1080x1920 (tiếng Anh, 54 giây) |
| `WhipBoss-promo-landscape.mp4` | Video giới thiệu ngang 1920x1080. Google Play nhận video qua link YouTube: tải bản này lên YouTube rồi dán link |
| `screenshot-title-en.png`, `screenshot-title-vi.png` | Ảnh chụp màn hình tiêu đề (tiếng Anh / tiếng Việt) |

Sinh lại:
- Icon và feature graphic: `node tools/brand/make-brand.cjs` (ra `tools/brand/out/`)
- Video: `tools/promo/make.sh` (ra `tools/promo/out/`)

Rồi chép vào thư mục này.
