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
2. Thêm ca test cùng tên file trong `.semgrep/` với comment `ruleid: <id>` (phải bị bắt) và `ok: <id>` (không bị bắt) ngay dòng trước đoạn code.
3. Chạy: `sh .githooks/ai-guard.sh test && sh .githooks/ai-guard.sh scan` (cần Docker).
4. Ngoại lệ có chủ đích: comment `nosemgrep: <id>` kèm lý do ở dòng đó.

Luật chạy ở 3 nơi: `pre-commit` (`.githooks/pre-commit`), `pre-push`, và job `ai-guard` trong CI (`ci-templates/.github/workflows/ai-guard.yml`). Máy không có Docker thì bỏ qua local, CI vẫn chặn.
