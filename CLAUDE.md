# frontend

React + Vite SPA (TypeScript), build thành static `dist/`, đóng gói image `nginx-unprivileged` chạy non-root cổng 8080. Có `worker/` và `wrangler.jsonc` cho Cloudflare.

## Lệnh
- `npm ci`, `npm run lint`, `npm run build`, test bằng vitest.
- `docker build -t frontend .` (Dockerfile prod); `docker compose up` dùng `Dockerfile.dev` ở cổng 3000.

## CI/CD
- `.github/workflows/ci.yml`, `nightly.yml`, `os-docker.yml` chỉ gọi workflow trong repo `ci-templates`. Logic pipeline nằm bên đó, đừng nhân bản vào đây.
- Chỉ nhánh `main` mới deploy (host port 8082). Health path `/`, smoke match `<div id="root"`.
- Verify chữ ký bằng `cosign.pub` ở gốc repo.
- `.trivyignore.yaml` ghi lý do mọi ngoại lệ (DS-0002 cho `Dockerfile.dev`, AGPL cho texlyre-busytex). Thêm ngoại lệ phải có `statement`.

## Quy ước
- Không commit `node_modules`, `dist`, `.playwright-mcp`, `.vitest`.
- Dockerfile phải qua hadolint `--failure-threshold error`.
- Bump tag `ci-templates` đồng bộ ở cả ba workflow.

## Lỗi AI hay gặp (ai-guard)
Luật semgrep ở `.semgrep/`, danh sách ở `docs/ai-mistakes.md`. Lỗi AI lặp lại lần 2 thì thêm luật + test, đừng chỉ ghi vào đây. Chạy `sh .githooks/ai-guard.sh test|scan`.

## Việc cần làm
Task nằm trên Gitea kanban: http://localhost:3000/Quy-Organisation/-/projects/1 (project `Tasks`, cột `Todo`, `Doing`, `Blocked`, `Done`; mỗi task là một issue, nhãn `P0|P1|P2`, body gồm mục tiêu, tiêu chí xong, phụ thuộc). Công cụ: `../ci-templates/scripts/tasks.sh` (đọc token `GITEA_TASK_TOKEN` từ `docker-lab/.env`, không in token ra, không commit `.env`). Xem đủ lệnh bằng `tasks.sh help`: `list`, `get`, `create`, `update`, `move`, `comment`, `close`, `delete`.
1. Lấy việc: `../ci-templates/scripts/tasks.sh list --col Todo`. Làm theo thứ tự P0 → P1 → P2.
2. Mỗi task giao cho đúng MỘT sub-agent, mỗi lần chỉ chạy một sub-agent; sub-agent báo kết quả về main agent khi xong (main agent không làm lại việc đó).
3. Trước khi làm: `../ci-templates/scripts/tasks.sh move <repo#n> Doing`.
4. Xong: `../ci-templates/scripts/tasks.sh comment <repo#n> "<kết quả>"`, rồi `move <repo#n> Done`, rồi `close <repo#n>`.
5. Bị chặn: `move <repo#n> Blocked` và `comment` ghi rõ lý do.
6. `delete` xóa thật issue, chỉ dùng khi chủ repo yêu cầu. Task phụ thuộc `ci-templates` ghi rõ tag tối thiểu trong body.
