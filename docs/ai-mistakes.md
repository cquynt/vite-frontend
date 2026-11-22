# Lỗi AI hay gặp (frontend)

Luật nằm ở `.semgrep/`. Mỗi luật có test trong cùng thư mục.

| Luật | Bắt gì |
|---|---|
| `ai-console-log-left-in` | `console.log/debug` còn sót |
| `ai-ts-suppress-comment` | `@ts-ignore`, `@ts-nocheck` |
| `ai-explicit-any` | `as any`, tham số `: any` |
| `ai-test-focused-or-skipped` | `.only`, `.skip` để lại |
| `ai-fake-assertion` | `expect(true).toBe(true)` |
| `ai-empty-catch` | `catch {}` nuốt lỗi |
| `ai-hardcoded-localhost` | URL `localhost` viết cứng |
| `ai-dockerfile-from-not-pinned` | `FROM` không pin `@sha256` |
| `ai-dockerfile-curl-pipe-shell` | `curl ... \| sh` |

## Docker và thành phần liên quan (bổ sung)
| File luật | Bắt gì |
|---|---|
| `dockerfile.yml` | secret trong ENV/ARG, `COPY .env`, `ADD` URL, `chmod 777`, `USER root` cuối, `sudo`, `EXPOSE 22`, `npm install` thay `npm ci`, `apk add` thiếu `--no-cache`, `apt-get install` thiếu `-y`/`--no-install-recommends` |
| `compose.yml` | `privileged`, `network_mode: host`, `docker.sock`, image không pin, cổng mở ra mọi interface, secret viết thẳng |
| `nginx.yml` | `add_header` trong `location` làm mất security headers, `autoindex on`, `server_tokens on`, cổng <1024 (non-root không bind được), CORS `*`, TLS cũ |
| `npm.yml` | phiên bản `*`/`latest`, `postinstall` tải mã bằng curl/wget, `strict-ssl=false`, registry http |
| `checks.sh` | `.dockerignore` phải có `.env` và `.git`, `.gitignore` phải có `.env` |


## Thêm luật mới (mỗi lỗi AI lặp lại lần 2)
1. Thêm luật vào `.semgrep/<tên>.yml` (message nói rõ cách sửa).
2. Thêm ca test cùng tên file trong `.semgrep/` với comment `ruleid: <id>` (phải bị bắt) và `ok: <id>` (không bị bắt); thiếu một trong hai thì `check` báo lỗi ngay dòng trước đoạn code.
3. Chạy: `sh .githooks/ai-guard.sh check && sh .githooks/ai-guard.sh test && sh .githooks/ai-guard.sh scan` (test/scan cần Docker).
4. Ngoại lệ có chủ đích: comment `nosemgrep: <id> (lý do)` ở dòng đó; thiếu lý do thì `check` báo lỗi.

Luật chạy ở 3 nơi bằng CÙNG một script `.githooks/ai-guard.sh` (`test|scan|check`): `pre-commit` (chỉ quét file đã staged, nhanh), `pre-push` (`pre-commit run --all-files`: quét cả repo), và job `ai-guard` trong CI (`ci-templates/.github/workflows/ai-guard.yml`, chạy script trong image semgrep). Máy không có Docker thì bỏ qua `test`/`scan` local (CI vẫn chặn); `check` không cần Docker.

## Hành vi ai-guard (chuẩn từ ci-templates)
- `ai-guard.sh`, `config-lint.sh`, `.semgrep/checks.sh`, `.githooks/pre-commit`, `.pre-commit-config.yaml`, `.yamllint.yaml`, `.github/actionlint.yaml` là bản chuẩn của `ci-templates`; repo con chỉ được đổi bằng `ci-templates/scripts/sync-ai-guard.sh` (`--check` để xem lệch). Luật riêng `.semgrep/*.yml` thì mỗi repo tự giữ.
- `scan` bỏ qua `node_modules`, `dist`, `build`, `coverage`, `.gradle`, `.git` (nhanh hơn, ít nhiễu).
- `checks.sh` kiểm: `.dockerignore` có `.env`/`.git`; `.gitignore` có `.env`; không có file `.env*` thật bị git theo dõi (trừ `.example/.sample/.template`); mỗi file luật có file test cùng tên với đủ `ruleid: <id>` và `ok: <id>` cho từng luật (semgrep `--test` tự bỏ qua luật thiếu test); mỗi `nosemgrep: <id>` phải trỏ luật có thật và kèm lý do; image semgrep ở `ai-guard.sh` khớp `ai-guard.yml`; image yamllint/actionlint ở `config-lint.sh` khớp `config-lint.yml`.
