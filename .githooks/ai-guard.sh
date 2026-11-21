#!/bin/sh
# ai-guard cục bộ: dùng chung image semgrep với CI (ci-templates/.github/workflows/ai-guard.yml). Khi bump semgrep ở CI, bump ở đây.
#   ai-guard.sh test  -> kiểm luật (semgrep --test)
#   ai-guard.sh scan  -> quét source bằng luật trong .semgrep/
set -e
cd "$(git rev-parse --show-toplevel)"
IMG='semgrep/semgrep:1.184.0@sha256:cc1b68266f267878b39739373ea9985b9a78e5d64497dd875c8de100b22695ed'
if ! docker info >/dev/null 2>&1; then
  echo "[ai-guard] Docker không chạy, bỏ qua ở máy local (CI vẫn chặn)."; exit 0
fi
case "$1" in
  test) docker run --rm -v "$PWD/.semgrep:/src" -w /src "$IMG" \
          semgrep --test --metrics=off --disable-version-check . ;;
  scan) docker run --rm -v "$PWD:/src" -w /src "$IMG" \
          semgrep scan --config .semgrep --exclude .semgrep --metrics=off --disable-version-check --error --quiet . ;;
  *) echo "usage: $0 test|scan"; exit 2 ;;
esac
