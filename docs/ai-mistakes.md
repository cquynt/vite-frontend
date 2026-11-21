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

## Thêm luật mới (mỗi lỗi AI lặp lại lần 2)
1. Thêm luật vào `.semgrep/<tên>.yml` (message nói rõ cách sửa).
2. Thêm ca test cùng tên file trong `.semgrep/` với comment `ruleid: <id>` (phải bị bắt) và `ok: <id>` (không bị bắt) ngay dòng trước đoạn code.
3. Chạy: `sh .githooks/ai-guard.sh test && sh .githooks/ai-guard.sh scan` (cần Docker).
4. Ngoại lệ có chủ đích: comment `nosemgrep: <id>` kèm lý do ở dòng đó.

Luật chạy ở 3 nơi: `pre-commit` (`.githooks/pre-commit`), `pre-push`, và job `ai-guard` trong CI (`ci-templates/.github/workflows/ai-guard.yml`). Máy không có Docker thì bỏ qua local, CI vẫn chặn.
