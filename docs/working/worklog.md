> append-only 시간순 작업 일지. 최신 항목이 맨 위. 새 항목은 맨 위에 추가.

# Worklog

## 형식 안내

```
## YYYY-MM-DD

- **무엇**: 한 줄 요약
- **왜**: 결정 이유 또는 맥락 (1~2줄)
- 관련 링크: 문서명 / 상대경로
```

한 날짜에 작업이 여럿이면 같은 `##` 블록 안에 `-` 항목으로 나열.
날짜가 같아도 세션이 다르면 구분선(`---`) 으로 분리.

---

## 2026-06-17

- **무엇**: docs 핸드북을 lean 구조로 정리
- **왜**: 초기 시드가 API/배포/테스트/화면 흐름까지 과하게 분리되어 있고, 실제 구현 근거가 없는 `TBD` 문서가 많아 다음 작업에 노이즈가 컸음.
- **내용 요약**:
  - API 계약, 배포 절차, 테스트 전략, 상세 frontend, 별도 user-flow, 별도 competition 문서를 제거
  - 핵심 내용은 project brief, PRD, architecture overview, data-ml, dev setup으로 흡수
  - ADR-0002를 lean docs 원칙으로 갱신하고 backlog/current-state를 현재 구조에 맞게 정리
- **관련 링크**: [ADR-0002: lean docs 핸드북 채택](../architecture/decisions/0002-docs-handbook-structure.md)

---

## 2026-06-16

- **무엇**: docs 핸드북 전체 구조 확정 및 시드 작성
- **왜**: 세션이 바뀌어도 AI가 프로젝트 맥락을 즉시 파악할 수 있도록 단일 출처(canonical facts) 기반의 풀 핸드북을 구축. brainstorming을 통해 한국어 본문 + 영어 식별자 혼용, 1순위 목적 = AI 세션 연속성으로 방향 확정.
- **내용 요약**:
  - `docs/` 하위 전체 파일 구조 설계 (README, overview, product, architecture, runbooks, testing, api, working, contributing)
  - 각 문서를 공통 사실(CANONICAL FACTS)에서만 파생하여 시드 작성
  - 루트 `AGENTS.md`에 세션 시작 시 `docs/` 읽기 라우팅 추가
  - 저장소 상태: Next.js 16 기본 스캐폴드(`src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/favicon.ico`) 외 기능 코드 없음. ML/백엔드/데이터 미구현.
- **관련 링크**: [ADR-0002: docs 핸드북 구조 결정](../architecture/decisions/0002-docs-handbook-structure.md)
