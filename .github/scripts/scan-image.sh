#!/bin/sh
# Quét image 1 lần (JSON), rồi dùng `trivy convert` cho báo cáo, SBOM và cổng chặn.
# Chạy trong container aquasec/trivy qua dr.sh (cwd=/src để đọc .trivyignore).
set -u
IMG=$1
SC="--scanners vuln,secret"
trivy image --quiet $SC --image-config-scanners misconfig,secret \
  --ignore-unfixed --list-all-pkgs --format json -o /tmp/r.json "$IMG" || exit 2

echo; echo "===== HIGH + CRITICAL (báo cáo, không chặn) ====="
trivy convert --quiet $SC --format table --report summary --severity HIGH,CRITICAL /tmp/r.json
trivy convert --quiet $SC --format table --table-mode detailed --severity HIGH,CRITICAL /tmp/r.json

echo; echo "===== SBOM CycloneDX (1500 byte đầu) ====="
trivy convert --quiet --format cyclonedx /tmp/r.json | head -c 1500; echo

echo; echo "===== CỔNG CHẶN: CRITICAL ====="
trivy convert --quiet $SC --format table --report summary --severity CRITICAL --exit-code 1 /tmp/r.json
rc=$?
[ $rc -eq 0 ] && echo "OK: không còn CRITICAL" || echo "FAIL: còn CRITICAL (mã $rc)"
exit $rc
