# D2A UX/UI Skill Bundle

D2A 보일러플레이트의 **AI 네이티브 UX 검증** 기능 묶음 — 본체([D2A_UX_UI](https://github.com/sooyachoco/D2A_UX_UI))에서 UX/UI 사용성 검증과 관련된 스킬·에이전트·데이터·게이트만 추출한 저장소.

> 출처 작업 기록: Notion — "🦍 AI 네이티브 사용성 테스트 스킬 구축"

## 전체 그림

```
[상류] 누구를 위해 / 왜              [하류] 만든 UI가 쓸 만한가
 refs/ux-research/      ──읽기──▶    ai-usability-test 스킬
 (페르소나·여정 단일출처)             (Playwright 3페르소나 자동 검증)
                                            │
                                            ▼
                                   MCP `ut:` done 게이트
                                   (S4 결함 → Phase 자동 차단)
```

사람이 눈으로 보던 UX 검수를, **코드가 숫자로 검사해 자동으로 막는 강제 게이트**로 전환한 묶음이다.
상류(리서치)와 하류(검증)는 페르소나·여정을 **한 곳에서만 정의**해 drift(정의 중복)를 제거한다.

## 구성

### 1. 스킬 (`.claude/skills/`)

| 파일 | 역할 |
|---|---|
| `ai-usability-test.md` | Playwright + 3페르소나(초보/파워/접근성) + Nielsen 휴리스틱 자동 사용성 테스트. 산출물 5종 생성, MCP `ut:` done 기준 |
| `ux-research-sync.md` | 실제 리서치 데이터를 MCP로 연결 → 신뢰도 3단계(🟢검증/🟢인접/🔵가설)로 ux-research 7종 주입. 단일 source 공급 |
| `ui-design-workflow.md` | PRD→0단계 게이트→3안 발산→확정 락→상태설계→자가점검→0-드리프트 전사→AI UT 게이트 |
| `create-spec.md` | spec/plan/tasks 생성. Step 0.5(리서치 로드) + Step 2.7.5(AI UT 자동 게이트) 포함 |
| `pre-launch-check.md` | 배포 전 검증 체크리스트 (UT_FINDINGS_REPORT 갈음 규칙 연동) |

### 2. 에이전트 (`.claude/subagent-templates/`)

| 파일 | 역할 |
|---|---|
| `accessibility.md` | 접근성 리뷰 서브에이전트 템플릿 (ARIA·Tab·Focus) |

### 3. UX 리서치 단일 source (`refs/ux-research/`)

페르소나·여정을 한 곳에서만 정의하는 SSOT. 검증 스킬은 **읽기만** 한다.

| 파일 | 역할 |
|---|---|
| `README.md` | 단일 source 규약 + 신뢰도 3단계 체계 |
| `PERSONA.md` ⭐ | P1 신규 / P2 헤비·도네이터 / P3 접근성 — UT 시뮬레이션 매핑 |
| `USER_JOURNEY_MAP.md` ⭐ | 유입~이탈 5단계 + 이탈 지점 |
| `USER_RESEARCH.md` | 가설·방법론·마일스톤 |
| `INTERVIEW_GUIDE.md` | AI 인터뷰어 작동 경계 (CAR 구조) |
| `INTERVIEW_NOTES.md` | 전사+요약+타임코드 템플릿 |
| `SURVEY_ANALYSIS.md` | 정량+주관식 융합 |
| `EMPATHY_MAP.md` | 페르소나별 공감맵 |
| `EXTERNAL_BENCHMARKS.md` | 외부 공개 데이터 (3자·벤치마크 등급, 검증 근거 미사용) |

### 4. MCP `ut:` 강제 게이트

| 파일 | 역할 |
|---|---|
| `d2a-mcp-server/src/tools/task-validator.ts` | `checkUtReport` — `done` 기준의 `ut: {리포트} :: S4=0,S3<=2` 평가. 위반 시 Phase 자동 차단 |
| `frontend/tests/ut/run-ut.mjs` | UT 러너. `tests/e2e/.auth/user.json` storageState 재사용 → 인증 상태에서 UT 실행 |

## `ut:` done 기준

`tasks.md` 의 `done` 항목에서 사용:

```yaml
done:
  - ut: specs/001-xxx/ut/UT_FINDINGS_REPORT.md :: S4=0,S3<=2
```

`submit_task` 시 리포트의 Executive Summary에서 S1~S4 카운트를 추출해 임계 규칙을 평가한다.
리포트 부재·카운트 미검출 시 **실패 처리**(UT 미실행을 통과로 오인 방지).

## Severity 분류 (Nielsen)

| 등급 | 기준 | 처리 |
|---|---|---|
| S4 Critical | 작업 완료 불가 | 즉시 수정 (배포 블로커) |
| S3 Major | 큰 불편·이탈 유발 | 다음 스프린트 |
| S2 Minor | 우회 가능 | 백로그 |
| S1 Cosmetic | 소소한 개선 | 여유 시 처리 |

## 비고

- 본 묶음은 D2A 보일러플레이트 본체에서 발췌한 것으로, 단독 실행보다는 본체 구조(`.claude/`, `d2a-mcp-server/`, `refs/`) 안에 배치해 사용하는 것을 전제로 한다.
- `refs/ux-research/` 페르소나는 대부분 🔵 가설/🟢 1차 데이터 기반이며 표본 한계가 명시돼 있다. 일반화하려면 추가 인터뷰·트래킹 검증이 필요하다.
