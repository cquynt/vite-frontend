#!/usr/bin/env bash
# Build + deploy to Cloudflare Workers (static assets + R2). Not used by Docker/CI.
#
# Needs: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID (wrangler),
#        R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (R2 S3 token, multipart upload for >300 MiB files),
#        aws CLI. Bucket name must match wrangler.jsonc.
set -euo pipefail
cd "$(dirname "$0")/.."

BUCKET=latex-studio-busytex
CORE=public/core/busytex
: "${CLOUDFLARE_ACCOUNT_ID:?}" "${R2_ACCESS_KEY_ID:?}" "${R2_SECRET_ACCESS_KEY:?}"

npm ci
[ -f "$CORE/busytex.wasm" ] || npx texlyre-busytex download-assets ./public/core

npx wrangler@4 r2 bucket create "$BUCKET" 2>/dev/null || true # exists -> fine

# Big files (> 25 MiB Workers-assets limit) go to R2 through the S3 API (multipart).
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto
for f in "$CORE"/busytex.wasm "$CORE"/texlive-*.data; do
  aws s3 cp "$f" "s3://$BUCKET/core/busytex/$(basename "$f")" \
    --endpoint-url "https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
done

npm run build # public/.assetsignore keeps the big files out of dist upload
npx wrangler@4 deploy
