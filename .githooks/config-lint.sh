#!/bin/sh
# config-lint: cú pháp + lint file KHÔNG phải code. MỘT script cho pre-commit (file staged), pre-push (cả repo) và CI
# (ci-templates/.github/workflows/config-lint.yml). Nguồn chuẩn: repo ci-templates, đồng bộ sang repo con bằng scripts/sync-ai-guard.sh.
#   config-lint.sh [file…]          -> files + actions (mặc định: mọi file git theo dõi)
#   config-lint.sh files [file…]    -> YAML: yamllint (.yamllint.yaml). JSON: cú pháp + key trùng. JSONC (*.jsonc, tsconfig*.json,
#                                      jsconfig*.json): cho comment + dấu phẩy cuối. Mọi file cấu hình: marker merge conflict;
#                                      file không phải YAML: khoảng trắng cuối dòng, thiếu newline cuối file (YAML do yamllint kiểm)
#   config-lint.sh actions [file…]  -> actionlint cho .github/workflows/*.y(a)ml và examples/*.yml (cấu hình: .github/actionlint.yaml)
# Có sẵn tool (yamllint + python3, actionlint) thì chạy thẳng (CI chạy trong image tool), không thì qua Docker.
# Khi bump image, sửa ở đây và ở config-lint.yml (checks.sh báo lệch).
set -e
self="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
YAMLLINT_IMG='pipelinecomponents/yamllint:0.35.27@sha256:f7f7b4f8824839e33690a880dbe20944128b0dc9c55522a0b92a29b3a905cecf'
ACTIONLINT_IMG='rhysd/actionlint:1.7.7@sha256:887a259a5a534f3c4f36cb02dca341673c6089431057242cdc931e9f133147e9'
SKIP='[config-lint] Docker không chạy, bỏ qua ở máy local (CI vẫn chặn).'

PY=$(cat <<'PYEOF'
import json, os, subprocess, sys
args = sys.argv[1:]
files = sys.stdin.buffer.read().decode().split('\0') if args[:1] == ['-0'] else args
files = [os.path.normpath(f) for f in files if f]
SKIP_DIRS = {'node_modules', 'dist', 'build', 'coverage', '.gradle', '.git'}
TEXT_EXT = {'.toml', '.properties', '.conf', '.ini', '.cfg', '.xml'}
TEXT_NAMES = {'.gitignore', '.dockerignore', '.gitattributes', '.editorconfig', '.assetsignore'}
CONFLICT = (b'<<<<<<< ', b'||||||| ', b'>>>>>>> ')
rc = 0

def err(f, n, msg):
    global rc
    rc = 1
    print(f'{f}:{n}: {msg}' if n else f'{f}: {msg}')

def kind(f):
    if SKIP_DIRS & set(f.split(os.sep)[:-1]) or not os.path.isfile(f):
        return None
    b = os.path.basename(f)
    e = os.path.splitext(b)[1].lower()
    if e in ('.yml', '.yaml'):
        return 'yaml'
    if e == '.jsonc' or (e == '.json' and b.startswith(('tsconfig', 'jsconfig'))):
        return 'jsonc'
    if e == '.json':
        return 'json'
    return 'text' if e in TEXT_EXT or b in TEXT_NAMES else None

def no_dup(pairs):
    d = {}
    for k, v in pairs:
        if k in d:
            raise ValueError(f'key trùng "{k}"')
        d[k] = v
    return d

def strip_jsonc(s):
    # Bỏ comment và dấu phẩy cuối nhưng giữ nguyên số dòng/cột để báo lỗi đúng chỗ.
    out, comma, i, n = [], None, 0, len(s)
    while i < n:
        c = s[i]
        if c == '"':
            j = i + 1
            while j < n and s[j] != '"':
                j += 2 if s[j] == '\\' else 1
            out.append(s[i:j + 1])
            comma, i = None, j + 1
            continue
        if s.startswith('//', i):
            j = s.find('\n', i)
            i = n if j < 0 else j
            continue
        if s.startswith('/*', i):
            j = s.find('*/', i + 2)
            if j < 0:
                raise ValueError('comment /* chưa đóng')
            out.append('\n' * s.count('\n', i, j))
            i = j + 2
            continue
        if c == ',':
            comma = len(out)
        elif c in '}]' and comma is not None:
            out[comma], comma = ' ', None
        elif not c.isspace():
            comma = None
        out.append(c)
        i += 1
    return ''.join(out)

yaml = []
for f in files:
    k = kind(f)
    if not k:
        continue
    data = open(f, 'rb').read()
    lines = data.split(b'\n')
    for n, line in enumerate(lines, 1):
        line = line.rstrip(b'\r')
        if line.startswith(CONFLICT) or line == b'=======':
            err(f, n, 'marker merge conflict')
        elif k != 'yaml' and line != line.rstrip(b' \t'):
            err(f, n, 'khoảng trắng cuối dòng')
    if k == 'yaml':
        yaml.append(f)
        continue
    if data and not data.endswith(b'\n'):
        err(f, len(lines), 'thiếu newline cuối file')
    if k == 'text':
        continue
    try:
        s = data.decode('utf-8-sig')
        json.loads(strip_jsonc(s) if k == 'jsonc' else s, object_pairs_hook=no_dup)
    except json.JSONDecodeError as e:
        err(f, e.lineno, f'JSON sai cú pháp: {e.msg} (cột {e.colno})')
    except (ValueError, UnicodeDecodeError) as e:
        err(f, 0, f'JSON không hợp lệ: {e}')
if yaml and subprocess.call(['yamllint', '-f', 'parsable', *yaml]):
    rc = 1
sys.exit(rc)
PYEOF
)

list0() {
  if git rev-parse --git-dir >/dev/null 2>&1; then git ls-files -z
  else find . \( -name .git -o -name node_modules -o -name dist -o -name build -o -name coverage -o -name .gradle \) -prune -o -type f -print0
  fi
}

lint_files() {  # $@: file… hoặc -0 (danh sách tách bằng NUL từ stdin)
  if command -v yamllint >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then python3 -c "$PY" "$@"
  elif docker info >/dev/null 2>&1; then
    docker run --rm -i -v "$PWD:/src" -w /src --entrypoint sh "$YAMLLINT_IMG" .githooks/config-lint.sh files "$@"
  else echo "$SKIP"
  fi
}

case "$1" in
  files|actions) mode="$1"; shift ;;
  -h|--help) sed -n '2,10p' "$self"; exit 0 ;;
  *) mode=all ;;
esac

case "$mode" in
  all)
    rc=0
    sh "$self" files "$@" || rc=1
    sh "$self" actions "$@" || rc=1
    exit $rc ;;
  files)
    if [ $# -eq 0 ]; then list0 | lint_files -0; else lint_files "$@"; fi ;;
  actions)
    [ $# -eq 0 ] && set -- .github/workflows/* examples/*
    wf=""
    for f in "$@"; do
      case "$f" in .github/workflows/*.yml|.github/workflows/*.yaml|examples/*.yml) [ -f "$f" ] && wf="$wf $f" ;; esac
    done
    [ -n "$wf" ] || exit 0
    # -shellcheck= : biến $DR_* cố ý không quote. -ignore: URL action dạng http://gitea:3000/... của Gitea.
    # shellcheck disable=SC2086
    al() { "$@" -shellcheck= -ignore 'invalid format because owner and repo and ref' $wf; }
    if command -v actionlint >/dev/null 2>&1; then al actionlint
    elif docker info >/dev/null 2>&1; then al docker run --rm -v "$PWD:/src" -w /src "$ACTIONLINT_IMG"
    else echo "$SKIP"
    fi ;;
esac
