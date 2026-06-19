<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:cems-docs-routing -->
# 프로젝트 문서 (docs/)

이 저장소는 기존 기획 문맥을 전제로 하지 않는다. 방향이 다시 정해지는 중이므로, 문서는 핸드북이 아니라 사용자 발화와 확정된 사실을 누적하는 회의록처럼 관리한다.

세션을 시작할 때 다음 순서로만 읽어라:

1. `docs/working/current-state.md` — 현재 문맥과 실제 저장소 상태
2. `docs/working/meeting-notes.md` — 사용자 발화 기반 누적 회의록
3. `docs/README.md` — 현재 docs 구조와 유지 규칙

## 수동 기록 트리거

사용자가 `정리 시작`, `세션 정리해줘`, `기록해줘`, `회의록 정리해줘`처럼 세션 정리를 요청하면 기록 모드로 전환한다.

기록 모드에서는 다음을 수행한다:

1. 현재 대화에서 사용자가 명시한 방향, 결정, 취소한 가정만 추린다.
2. 작업 중 직접 확인한 사실과 변경 파일이 있으면 `git status --short`와 필요한 diff로 확인한다.
3. `docs/working/meeting-notes.md`에 날짜별 항목으로 추가한다.
4. 다음 세션의 첫 문맥이 달라졌으면 `docs/working/current-state.md`를 짧게 갱신한다.
5. 제품/아키텍처/ML 계획은 사용자가 확정했거나 실제 구현 근거가 생긴 경우에만 별도 문서로 만든다.
6. 커밋/푸시는 사용자가 명시적으로 요청했을 때만 한다.

**세션을 마칠 때:** 사용자가 명시했거나 작업 중 확인한 사실만 `docs/working/meeting-notes.md`에 기록하고, 다음 세션의 진입점이 바뀌었으면 `docs/working/current-state.md`를 갱신한다. 제품/아키텍처/ML 계획 문서는 사용자가 방향을 확정했거나 실제 구현 근거가 생긴 뒤에만 새로 만든다. 자세한 유지 규칙은 `docs/contributing.md` 참고.
<!-- END:cems-docs-routing -->
