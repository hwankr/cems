# Contributing

이 저장소는 세션이 바뀌어도 작업 맥락이 유지되는 것을 우선한다. 문서는 짧게 유지하고, 확정되지 않은 내용을 긴 `TBD` 문서로 분리하지 않는다.

## 세션 흐름

1. 시작할 때 [working/current-state.md](working/current-state.md)를 먼저 읽는다.
2. 작업에 필요한 문서만 추가로 읽는다. 지도는 [README.md](README.md)에 있다.
3. 코드 변경 전 Next.js 16 관련 내용은 `node_modules/next/dist/docs/`에서 확인한다.
4. 끝날 때 [working/current-state.md](working/current-state.md)를 최신 상태로 바꾸고 [working/worklog.md](working/worklog.md)에 항목을 추가한다.

## 문서 규칙

- 새 파일은 현재 사실이나 반복해서 참조할 결정이 있을 때만 만든다.
- 불확실한 내용은 한 줄 `TBD`로 남기고, 필요한 입력을 같이 적는다.
- API, 배포, 테스트처럼 아직 실체가 없는 영역은 별도 문서보다 [working/backlog.md](working/backlog.md)에 둔다.
- 본문은 한국어를 기본으로 쓰고, 코드/파일명/명령어는 영어로 쓴다.
- 링크는 현재 파일 기준 상대경로를 사용한다.

## Git

- 사용자가 요청할 때만 커밋한다.
- 기존 사용자 변경을 되돌리지 않는다.
- 한 커밋은 하나의 논리적 변경에 맞춘다.

## ADR

되돌리기 어려운 결정은 [architecture/decisions/](architecture/decisions/)에 ADR로 남긴다. 파일명, 변수명 같은 작은 선택은 ADR 대상이 아니다.
