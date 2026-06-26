#!/usr/bin/env bash
# D2A UX/UI Skill Bundle 설치기
# 이 번들의 오버레이 파일을 d2a-boilerplate-claude 의 template/ 에 복사한다.
#
# 사용법:
#   bash install.sh <d2a-boilerplate-claude 경로>
#   예) bash install.sh ~/work/d2a-boilerplate-claude
#
# 동작: 신규 파일은 복사, 기존 파일(create-spec.md/pre-launch-check.md/accessibility.md/
# task-validator.ts)은 .bak-<timestamp> 백업 후 덮어쓴다. CLAUDE.md 등록·dist 재빌드는
# 수동 단계로 안내한다(자동 편집하지 않음).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  echo "❌ 사용법: bash install.sh <d2a-boilerplate-claude 경로>"
  exit 1
fi

# template/ 위치 결정: 본체 루트면 template/, 이미 template/ 를 가리키면 그대로.
if [ -d "$TARGET/template" ]; then
  DEST="$TARGET/template"
elif [ -f "$TARGET/CLAUDE.md" ] && [ -d "$TARGET/.claude" ]; then
  DEST="$TARGET"
else
  echo "❌ '$TARGET' 에서 d2a-boilerplate-claude 구조(template/ 또는 CLAUDE.md+.claude/)를 찾지 못했습니다."
  exit 1
fi
echo "→ 설치 대상: $DEST"

TS="$(date +%Y%m%d-%H%M%S)"
OVERLAY=(
  ".claude/skills"
  ".claude/subagent-templates"
  "refs/ux-research"
  "frontend/tests/ut"
  "d2a-mcp-server/src/tools/task-validator.ts"
)

copy_one() {
  local rel="$1" src="$SCRIPT_DIR/$1" dst="$DEST/$1"
  if [ -d "$src" ]; then
    mkdir -p "$dst"
    for f in "$src"/*; do
      local name; name="$(basename "$f")"
      [ -e "$dst/$name" ] && cp -p "$dst/$name" "$dst/$name.bak-$TS" && echo "  ⤷ 백업: $rel/$name.bak-$TS"
      cp -p "$f" "$dst/$name"
      echo "  ✓ $rel/$name"
    done
  else
    mkdir -p "$(dirname "$dst")"
    [ -e "$dst" ] && cp -p "$dst" "$dst.bak-$TS" && echo "  ⤷ 백업: $rel.bak-$TS"
    cp -p "$src" "$dst"
    echo "  ✓ $rel"
  fi
}

for item in "${OVERLAY[@]}"; do copy_one "$item"; done

cat <<'EOF'

✅ 파일 복사 완료. 아래 2가지 수동 단계를 마저 진행하세요:

[1] CLAUDE.md 스킬 표에 4종 등록 (미등록 시 자동 호출 안 됨)
    | `/ux-audit`          | 구현 전 UX 진단 (7가지 휴리스틱 렌즈 — advisory) |
    | `/ux-research-sync`  | 외부 리서치 데이터를 refs/ux-research SSOT에 적재 |
    | `/ui-design-workflow`| PRD→게이트0→3안 발산→락→상태설계→핸드오프 |
    | `/ai-usability-test` | Playwright 3 페르소나 자동 사용성 테스트 |

[2] MCP 서버 재빌드 (ut: 게이트 활성화)
    cd d2a-mcp-server && npm install && npm run build
    grep -rl checkUtReport dist/   # dist/tools/task-validator.js 나오면 OK

자세한 병합 판정·매핑은 INTEGRATION.md 참조.
EOF
