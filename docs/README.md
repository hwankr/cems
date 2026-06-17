# cems docs

cems 문서는 새 세션이 바로 이어서 작업할 수 있게 하는 최소 핸드북이다. 현재 저장소는 Next.js 기본 스캐폴드와 문서만 있으며, ML/백엔드/데이터 기능 코드는 아직 없다.

## 읽는 순서

1. [working/current-state.md](working/current-state.md) — 현재 상태와 바로 다음 작업
2. [overview/project-brief.md](overview/project-brief.md) — 프로젝트 목적과 대회 맥락
3. 작업에 맞는 문서:
   - 제품 범위: [product/prd.md](product/prd.md)
   - 시스템 구조: [architecture/overview.md](architecture/overview.md)
   - 데이터/ML: [architecture/data-ml.md](architecture/data-ml.md)
   - 로컬 실행: [runbooks/dev-setup.md](runbooks/dev-setup.md)

코드를 쓰기 전에는 루트 [AGENTS.md](../AGENTS.md) 규칙에 따라 `node_modules/next/dist/docs/`의 관련 Next.js 16 문서를 먼저 확인한다.

## 문서 지도

| 문서 | 용도 |
| --- | --- |
| [overview/project-brief.md](overview/project-brief.md) | 한 장 요약, 대회 맥락, 확정/불확실 사항 |
| [overview/glossary.md](overview/glossary.md) | 반복해서 쓰는 용어와 단위 |
| [product/prd.md](product/prd.md) | 제품 범위, MVP 흐름, 열린 질문 |
| [architecture/overview.md](architecture/overview.md) | 현재 코드 구조와 목표 시스템 경계 |
| [architecture/data-ml.md](architecture/data-ml.md) | 데이터/ML 파이프라인 초안 |
| [architecture/decisions/](architecture/decisions/) | ADR 목록과 큰 결정 기록 |
| [runbooks/dev-setup.md](runbooks/dev-setup.md) | 설치, 실행, 검증 명령 |
| [working/current-state.md](working/current-state.md) | 세션 첫 읽기용 최신 스냅샷 |
| [working/backlog.md](working/backlog.md) | 다음 작업 후보 |
| [working/worklog.md](working/worklog.md) | append-only 작업 이력 |
| [contributing.md](contributing.md) | 작업/문서 유지 규칙 |

## 유지 원칙

- `TBD`만 채우기 위한 별도 문서는 만들지 않는다. 확정 전 아이디어는 [working/backlog.md](working/backlog.md)에 둔다.
- 문서가 길어지면 먼저 기존 문서에 흡수할 수 있는지 본다. 새 파일은 안정된 사실이나 반복 참조할 결정이 생겼을 때 만든다.
- 세션이 끝나면 [working/current-state.md](working/current-state.md)는 최신 상태로 교체하고, [working/worklog.md](working/worklog.md)에는 한 항목을 추가한다.
- 수치와 외부 사실은 추정이면 `추정`이라고 표시하고, 확정되면 출처를 남긴다.
