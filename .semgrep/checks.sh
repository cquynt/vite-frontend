#!/bin/sh
# Kiểm tra cấu trúc mà semgrep không làm được (thiếu dòng trong file). Chạy từ gốc repo: sh .semgrep/checks.sh
rc=0
fail() { echo "ai-guard check: $1"; rc=1; }
if [ -f Dockerfile ]; then
  [ -f .dockerignore ] || fail ".dockerignore thiếu: COPY . . đưa .env và .git vào image"
  for p in .env .git; do
    grep -qE "^$p(/|\*)?\$" .dockerignore 2>/dev/null || fail ".dockerignore phải liệt kê $p"
  done
fi
if [ -f .gitignore ]; then
  grep -qE '^(\*?\.env|\.env\*)$' .gitignore || fail ".gitignore phải chứa .env (tránh commit secret)"
fi
exit $rc
