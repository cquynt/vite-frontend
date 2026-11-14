# P1-03: Pin base image theo digest
Trạng thái: chưa làm
File: `Dockerfile`, `Dockerfile.dev`, `.github/workflows/ci.yml`, `matrix.yml`

## Việc cần làm
1. Pin `node:22-alpine` và `busybox:stable-musl` (hoặc image web server mới) theo `tag@sha256:...` trong `Dockerfile`.
2. Cấu hình Renovate/Dependabot (xem P1-06 của ci-templates) để bump digest tự động.
3. Giữ nhất quán `test-image` trong `ci.yml` với tag Node ở Dockerfile.
4. Ghi chú: bước `npx texlyre-busytex download-assets` tải từ mạng lúc build; cân nhắc pin phiên bản package và kiểm tra checksum asset nếu công cụ hỗ trợ.

## Nghiệm thu
- Build lặp lại cho cùng digest ra cùng base image.
- Hadolint vẫn xanh.
