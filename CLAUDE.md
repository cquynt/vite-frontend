# frontend

React + Vite SPA (TypeScript), build thành static `dist/`, đóng gói image `busybox httpd` chạy non-root cổng 8080. Có `worker/` và `wrangler.jsonc` cho Cloudflare.

## Lệnh
- `npm ci`, `npm run lint`, `npm run build`, test bằng vitest.
- `docker build -t frontend .` (Dockerfile prod); `docker compose up` dùng `Dockerfile.dev` ở cổng 3000.

## CI/CD
- `.github/workflows/ci.yml`, `matrix.yml`, `nightly.yml` chỉ gọi workflow trong repo `ci-templates`. Logic pipeline nằm bên đó, đừng nhân bản vào đây.
- Chỉ nhánh `main` mới deploy (host port 8082). Health path `/`, smoke match `<div id="root"`.
- Verify chữ ký bằng `cosign.pub` ở gốc repo.
- `.trivyignore.yaml` ghi lý do mọi ngoại lệ (DS-0002 cho `Dockerfile.dev`, AGPL cho texlyre-busytex). Thêm ngoại lệ phải có `statement`.

## Quy ước
- Không commit `node_modules`, `dist`, `.playwright-mcp`, `.vitest`.
- Dockerfile phải qua hadolint `--failure-threshold error`.
- Bump tag `ci-templates` đồng bộ ở cả ba workflow.

## Việc cần làm
Xem `todos/`. Mỗi file là một task độc lập. Xong thì đổi `Trạng thái` ở đầu file thành `xong`. Task phụ thuộc `ci-templates` ghi rõ tag tối thiểu cần dùng.
