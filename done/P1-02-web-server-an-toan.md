# P1-02: Web server phục vụ SPA đúng cách và an toàn
Trạng thái: xong
File: `Dockerfile`, file cấu hình server mới (vd `nginx.conf`)

## Vấn đề
`busybox httpd` không có SPA fallback (route client trả 404 khi reload), không gzip/brotli, không có security header (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy). ZAP baseline sẽ báo các header này.

## Việc cần làm
1. Chọn `nginxinc/nginx-unprivileged` hoặc Caddy (non-root, cổng 8080).
2. Cấu hình: `try_files $uri /index.html`, cache dài cho file có hash, `no-cache` cho `index.html`, gzip.
3. Thêm security header. CSP phải cho phép WASM của BusyTeX (`wasm-unsafe-eval`) và worker; kiểm tra bằng trình duyệt.
4. Thêm `HEALTHCHECK` vào Dockerfile.
5. Kiểm tra `smoke-match` (`<div id="root"`) và health path `/` vẫn đúng.
6. Chạy lại hadolint và ZAP.

## Nghiệm thu
- Reload ở route con vẫn trả 200 và trang đúng.
- ZAP không còn cảnh báo thiếu header chính.
- Image vẫn chạy non-root, kích thước tăng không đáng kể.

## Lưu ý
Làm trước P0-04 của ci-templates (ZAP có cổng chặn) để pipeline không đỏ ngay khi bật.
