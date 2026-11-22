#!/bin/sh
# Kiểm tra cấu trúc mà semgrep không làm được. Chạy từ gốc repo: sh .semgrep/checks.sh
# Nguồn chuẩn: ci-templates (đồng bộ bằng scripts/sync-ai-guard.sh). Không cần Docker, không cần git.
rc=0
D="${RULES_DIR:-.semgrep}"
fail() { echo "ai-guard check: $1"; rc=1; }

# 1. Docker: .dockerignore phải chặn .env và .git
if [ -f Dockerfile ]; then
  [ -f .dockerignore ] || fail ".dockerignore thiếu: COPY . . đưa .env và .git vào image"
  for p in .env .git; do
    grep -qE "^$p(/|\*)?\$" .dockerignore 2>/dev/null || fail ".dockerignore phải liệt kê $p"
  done
fi

# 2. .gitignore phải có .env; không file .env* thật nào đang được theo dõi (trừ mẫu)
if [ -f .gitignore ]; then
  grep -qE '^(\*?\.env|\.env\*)$' .gitignore || fail ".gitignore phải chứa .env (tránh commit secret)"
fi
if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
  git ls-files | grep -E '(^|/)\.env(\.[^/]*)?$' | grep -vE '\.(example|sample|template)$' | while read -r f; do
    echo "ai-guard check: $f đang được git theo dõi (secret?): git rm --cached $f"
  done | grep . && rc=1
fi

# 3. Mỗi luật phải có test: file test cùng tên + ca `ruleid: <id>` và `ok: <id>` (semgrep --test bỏ qua luật thiếu test)
for y in "$D"/*.yml; do
  [ -f "$y" ] || continue
  case "$y" in *.test.yml) continue ;; esac
  b="${y%.yml}"
  t=""
  for c in "$b".*; do
    [ "$c" = "$y" ] && continue
    [ "$c" = "$b.sh" ] && continue
    t="$c"; break
  done
  if [ -z "$t" ]; then fail "$y chưa có file test cùng tên ($b.<đuôi>)"; continue; fi
  for id in $(sed -n 's/^ *- id: *//p' "$y"); do
    grep -q "ruleid: *$id\b" "$t" || fail "luật $id thiếu ca 'ruleid: $id' trong $t"
    grep -q "ok: *$id\b" "$t" || fail "luật $id thiếu ca 'ok: $id' trong $t"
  done
done

# 4. nosemgrep phải kèm lý do (sau id) và id phải là luật có thật
ids=$(cat "$D"/*.yml 2>/dev/null | sed -n 's/^ *- id: *//p')
grep -rnI --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.gradle \
  --exclude-dir="$(basename "$D")" --exclude=ai-mistakes.md --exclude=CLAUDE.md --exclude=README.md \
  'nosemgrep:' . 2>/dev/null | while IFS= read -r line; do
  rest=$(printf '%s' "$line" | sed -n 's/.*nosemgrep: *//p')
  id=${rest%% *}
  reason=${rest#"$id"}
  printf '%s\n' "$ids" | grep -qx "$id" || echo "ai-guard check: nosemgrep trỏ tới luật không tồn tại ($id): ${line%%:*}"
  [ -n "$(printf '%s' "$reason" | tr -d ' ()')" ] || echo "ai-guard check: nosemgrep thiếu lý do: ${line%%nosemgrep*}"
done | grep . && rc=1

# 5. Image semgrep ở ai-guard.sh phải khớp workflow (nếu có cả hai trong repo)
if [ -f .githooks/ai-guard.sh ] && [ -f .github/workflows/ai-guard.yml ]; then
  a=$(grep -o "semgrep/semgrep:[^' ]*" .githooks/ai-guard.sh | head -1)
  w=$(grep -o "semgrep/semgrep:[^' ]*" .github/workflows/ai-guard.yml | sort -u)
  [ "$a" = "$w" ] || fail "image semgrep lệch: ai-guard.sh ($a) khác ai-guard.yml ($w)"
fi

# 6. Image ở config-lint.sh phải khớp config-lint.yml (nếu có cả hai trong repo)
if [ -f .githooks/config-lint.sh ] && [ -f .github/workflows/config-lint.yml ]; then
  for img in pipelinecomponents/yamllint rhysd/actionlint; do
    a=$(grep -o "$img:[^' ]*" .githooks/config-lint.sh | head -1)
    w=$(grep -o "$img:[^' ]*" .github/workflows/config-lint.yml | sort -u)
    [ "$a" = "$w" ] || fail "image $img lệch: config-lint.sh ($a) khác config-lint.yml ($w)"
  done
fi
exit $rc
