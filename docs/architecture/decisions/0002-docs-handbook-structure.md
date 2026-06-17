# 0002 - lean docs 핸드북 채택

| 항목 | 값 |
| --- | --- |
| 상태 | 채택 |
| 최초 작성 | 2026-06-16 |
| 정리 | 2026-06-17 |
| 결정자 | hwankr |

## 맥락

cems는 현재 Next.js 스캐폴드 단계이며 실제 기능 코드가 없다. 초기 docs 시드는 세션 연속성을 위해 넓게 만들었지만, 구현 근거가 없는 API/테스트/배포/화면 문서가 대부분 `TBD`로 채워져 유지 비용이 커졌다.

문서의 목적은 미래 기능을 미리 분류하는 것이 아니라 다음 세션이 현재 상태와 다음 결정을 빠르게 파악하게 하는 것이다.

## 결정

`docs/`는 lean handbook으로 유지한다.

- 현재 사실, 다음 결정, 실제 실행 절차가 있는 문서만 둔다.
- `TBD`만 많은 영역은 별도 문서를 만들지 않고 [working/backlog.md](../../working/backlog.md)에 작업 후보로 둔다.
- API 계약, 배포 절차, 테스트 전략은 실제 코드/플랫폼/테스트 도구가 생긴 뒤 작성한다.
- 세션 진입점은 계속 [working/current-state.md](../../working/current-state.md)로 둔다.

현재 유지하는 큰 축:

| 축 | 문서 |
| --- | --- |
| 개요 | `overview/project-brief.md`, `overview/glossary.md` |
| 제품 | `product/prd.md` |
| 아키텍처 | `architecture/overview.md`, `architecture/data-ml.md`, `architecture/decisions/` |
| 실행 | `runbooks/dev-setup.md` |
| 작업 상태 | `working/current-state.md`, `working/backlog.md`, `working/worklog.md` |

## 결과

- 문서 수를 줄여 스캔 비용을 낮춘다.
- 추정 API나 배포 절차가 실제 설계처럼 보이는 문제를 줄인다.
- 새 영역이 필요해지면 기존 문서에 먼저 흡수하고, 반복 참조할 만큼 안정되면 분리한다.

## 대안

| 대안 | 판단 |
| --- | --- |
| 풀 핸드북 구조 유지 | 현재 단계에서는 `TBD` 문서가 많아 과분류다. |
| 문서를 거의 없애기 | 세션 연속성과 Next.js 16 주의 규칙을 잃기 쉽다. |

## 참고

- 문서 지도: [../../README.md](../../README.md)
- 유지 규칙: [../../contributing.md](../../contributing.md)
