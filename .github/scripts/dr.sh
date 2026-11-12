#!/usr/bin/env bash
# Chạy 1 tool trong container với source repo copy vào /src.
# (job container và Docker daemon ở khác filesystem nên không bind-mount được; dùng docker cp)
# Dùng: [DR_OPTS="-e A=b -v vol:/x"] dr.sh <image> <args...>
set -u
name="dr-${GITHUB_RUN_ID:-local}-$RANDOM"
# shellcheck disable=SC2086
docker create --name "$name" -w /src ${DR_OPTS:-} "$@" >/dev/null || exit 2
docker cp . "$name:/src"
docker start -a "$name"; rc=$?
docker rm -f "$name" >/dev/null
exit $rc
