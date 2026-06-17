<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:cems-docs-routing -->
# 프로젝트 문서 (docs/)

이 저장소의 작업 흐름·결정·현재 상태는 `docs/` 핸드북에 있다. 세션이 바뀌어도 흐름을 잃지 않도록, **세션을 시작할 때 다음 순서로 먼저 읽어라:**

1. `docs/working/current-state.md` — 지금 어디까지 됐는지 (필수 첫 읽기)
2. `docs/README.md` — docs 지도와 읽는 순서
3. 작업과 관련된 `docs/overview/`·`docs/architecture/` 문서

**세션을 마칠 때:** `docs/working/current-state.md`와 `docs/working/worklog.md`를 갱신하고, 되돌리기 어려운 결정은 `docs/architecture/decisions/`에 ADR로 남겨라. 자세한 유지 규칙은 `docs/contributing.md` 참고.
<!-- END:cems-docs-routing -->
