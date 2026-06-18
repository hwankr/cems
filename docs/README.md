# cems docs

cems 문서는 현재 확정된 제품 계획을 담는 핸드북이 아니다. 이전 기획성 문서는 제거했고, 앞으로는 사용자가 말한 내용과 작업 중 확인한 사실만 회의록처럼 누적한다.

## 읽는 순서

1. [working/current-state.md](working/current-state.md) — 현재 문맥과 실제 저장소 상태
2. [working/meeting-notes.md](working/meeting-notes.md) — 사용자 발화 기반 누적 회의록
3. [contributing.md](contributing.md) — 문서 유지 규칙

코드를 수정하기 전에는 루트 [AGENTS.md](../AGENTS.md) 규칙에 따라 `node_modules/next/dist/docs/`의 관련 Next.js 16 문서를 먼저 확인한다.

## 문서 지도

| 문서 | 용도 |
| --- | --- |
| [working/current-state.md](working/current-state.md) | 다음 세션이 먼저 읽는 짧은 상태 |
| [working/meeting-notes.md](working/meeting-notes.md) | 날짜별 회의록과 확정된 사용자 발화 |
| [contributing.md](contributing.md) | 회의록식 docs 유지 규칙 |

## 유지 원칙

- 사용자가 말하지 않은 제품 방향, 모델, 데이터, 화면, 배포 계획을 문서에 먼저 만들지 않는다.
- 회의록에는 사용자 발화, 확정된 결정, 작업 중 직접 확인한 사실만 적는다.
- 제품/아키텍처/ML 문서는 반복 참조할 만큼 방향이 확정되거나 실제 구현 근거가 생긴 뒤에만 새로 만든다.
- 오래된 가정이 새 세션의 기준처럼 보이면 삭제하거나 명확히 폐기한다.
