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

**세션을 마칠 때:** 사용자가 명시했거나 작업 중 확인한 사실만 `docs/working/meeting-notes.md`에 기록하고, 다음 세션의 진입점이 바뀌었으면 `docs/working/current-state.md`를 갱신한다. 제품/아키텍처/ML 계획 문서는 사용자가 방향을 확정했거나 실제 구현 근거가 생긴 뒤에만 새로 만든다. 자세한 유지 규칙은 `docs/contributing.md` 참고.
<!-- END:cems-docs-routing -->
