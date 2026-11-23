#!/bin/sh
# ai-guard: MỘT script cho pre-commit, pre-push và CI (ci-templates/.github/workflows/ai-guard.yml).
# Nguồn chuẩn: repo ci-templates. Đồng bộ sang repo con bằng scripts/sync-ai-guard.sh (không sửa tay ở repo con).
#   ai-guard.sh test         -> kiểm luật (semgrep --test)
#   ai-guard.sh scan [file…] -> quét source (mặc định cả repo; pre-commit truyền file đã staged)
#   ai-guard.sh check        -> kiểm cấu trúc (<RULES_DIR>/checks.sh, nếu có; không cần Docker)
# Có sẵn `semgrep` (CI chạy trong image semgrep) thì chạy thẳng, không thì qua Docker.
# Biến: RULES_DIR (mặc định .semgrep). Khi bump semgrep, sửa IMG ở đây và ở ai-guard.yml (checks.sh báo lệch).
set -e
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
IMG='semgrep/semgrep:1.184.0@sha256:cc1b68266f267878b39739373ea9985b9a78e5d64497dd875c8de100b22695ed'
RULES_DIR="${RULES_DIR:-.semgrep}"
mode="$1"; [ $# -gt 0 ] && shift
# Thư mục sinh ra/phụ thuộc: bỏ qua cho nhanh (bind mount macOS chậm với node_modules) và bớt nhiễu.
EXCL="--exclude $RULES_DIR --exclude node_modules --exclude dist --exclude build --exclude coverage --exclude .gradle --exclude .build --exclude DerivedData --exclude .swiftpm --exclude .git"
FLAGS="--metrics=off --disable-version-check"

case "$mode" in
  check)
    [ -f "$RULES_DIR/checks.sh" ] && exec sh "$RULES_DIR/checks.sh"
    exit 0 ;;
  test|scan) ;;
  *) echo "usage: $0 test|scan [file...]|check"; exit 2 ;;
esac

if command -v semgrep >/dev/null 2>&1; then
  sg() { "$@"; }
elif docker info >/dev/null 2>&1; then
  sg() { docker run --rm -v "$PWD:/src" -w /src "$IMG" "$@"; }
else
  echo "[ai-guard] Docker không chạy, bỏ qua $mode ở máy local (CI vẫn chặn)."; exit 0
fi

case "$mode" in
  test) sg sh -c 'cd "$1" && shift && exec semgrep --test "$@" .' _ "$RULES_DIR" $FLAGS ;;
  scan)
    [ $# -eq 0 ] && set -- .
    # shellcheck disable=SC2086
    sg semgrep scan --config "$RULES_DIR" $EXCL $FLAGS --error --quiet "$@" ;;
esac
