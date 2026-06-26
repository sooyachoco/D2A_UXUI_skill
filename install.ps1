<#
  D2A UX/UI Skill Bundle 설치기 (Windows / PowerShell)
  이 번들의 오버레이 파일을 d2a-boilerplate-claude 의 template/ 에 복사한다.

  사용법:
    pwsh ./install.ps1 -Target <d2a-boilerplate-claude 경로>
    예) pwsh ./install.ps1 -Target C:\work\d2a-boilerplate-claude

  신규 파일은 복사, 기존 파일은 .bak-<timestamp> 백업 후 덮어쓴다.
  CLAUDE.md 등록·dist 재빌드는 수동 단계로 안내한다.
#>
param([Parameter(Mandatory=$true)][string]$Target)
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (Test-Path (Join-Path $Target "template")) {
  $Dest = Join-Path $Target "template"
} elseif ((Test-Path (Join-Path $Target "CLAUDE.md")) -and (Test-Path (Join-Path $Target ".claude"))) {
  $Dest = $Target
} else {
  Write-Error "'$Target' 에서 d2a-boilerplate-claude 구조(template/ 또는 CLAUDE.md+.claude/)를 찾지 못했습니다."
  exit 1
}
Write-Host "→ 설치 대상: $Dest"

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$overlay = @(
  ".claude/skills",
  ".claude/subagent-templates",
  "refs/ux-research",
  "frontend/tests/ut",
  "d2a-mcp-server/src/tools/task-validator.ts"
)

function Copy-One($rel) {
  $src = Join-Path $ScriptDir $rel
  $dst = Join-Path $Dest $rel
  if (Test-Path $src -PathType Container) {
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    Get-ChildItem -File $src | ForEach-Object {
      $target = Join-Path $dst $_.Name
      if (Test-Path $target) { Copy-Item $target "$target.bak-$ts"; Write-Host "  ⤷ 백업: $rel/$($_.Name).bak-$ts" }
      Copy-Item $_.FullName $target -Force
      Write-Host "  ✓ $rel/$($_.Name)"
    }
  } else {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst) | Out-Null
    if (Test-Path $dst) { Copy-Item $dst "$dst.bak-$ts"; Write-Host "  ⤷ 백업: $rel.bak-$ts" }
    Copy-Item $src $dst -Force
    Write-Host "  ✓ $rel"
  }
}

foreach ($item in $overlay) { Copy-One $item }

Write-Host ""
Write-Host "✅ 파일 복사 완료. 아래 2가지 수동 단계를 마저 진행하세요:"
Write-Host ""
Write-Host "[1] CLAUDE.md 스킬 표에 4종 등록 (ux-audit / ux-research-sync / ui-design-workflow / ai-usability-test)"
Write-Host "[2] MCP 재빌드: cd d2a-mcp-server; npm install; npm run build  (dist/ 에 checkUtReport 반영 확인)"
Write-Host ""
Write-Host "자세한 병합 판정·매핑은 INTEGRATION.md 참조."
