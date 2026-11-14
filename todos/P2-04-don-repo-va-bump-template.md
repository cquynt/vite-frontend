# P2-04: Dọn repo và bump template
Trạng thái: chưa làm
File: `.gitignore`, `.github/workflows/*.yml`, `.dockerignore`

## Việc cần làm
1. Thêm `.playwright-mcp/`, `.vitest/`, `coverage/` vào `.gitignore` và `.dockerignore`. Xóa các file `page-*.yml` đã commit nhầm nếu có (`git ls-files .playwright-mcp`).
2. Kiểm tra thư mục lạ `--help/` và `frontend/` lồng bên trong; xóa hoặc ghi lý do giữ.
3. Sau khi ci-templates phát hành tag mới (P0, P1): bump `@v1.x` ở `ci.yml`, `nightly.yml` và `matrix.yml` cho cùng một tag.
4. `matrix.yml`: dùng chế độ giảm ma trận cho PR khi ci-templates P2-13 xong.
5. Thêm `zap.conf` nếu cần hạ một số rule baseline, mỗi ngoại lệ có lý do.

## Nghiệm thu
- `git status` sạch sau khi chạy test và Playwright cục bộ.
- Ba workflow dùng cùng một tag ci-templates.
