# Contributing

이 저장소의 docs는 완성된 기획 핸드북이 아니라 회의록이다. 방향이 다시 정해지는 중이므로, 사용자가 말한 내용과 작업 중 확인한 사실만 누적한다.

## 세션 흐름

1. 시작할 때 [working/current-state.md](working/current-state.md)를 먼저 읽는다.
2. 이어서 [working/meeting-notes.md](working/meeting-notes.md)를 읽고, 이전 가정을 제품 기준으로 확대 해석하지 않는다.
3. 코드 변경 전 Next.js 16 관련 내용은 `node_modules/next/dist/docs/`에서 확인한다.
4. 끝날 때 새로 확인한 사실이나 사용자가 명시한 방향만 [working/meeting-notes.md](working/meeting-notes.md)에 추가한다.
5. 다음 세션의 첫 문맥이 달라졌으면 [working/current-state.md](working/current-state.md)를 짧게 갱신한다.

## 문서 규칙

- 새 파일은 반복해서 참조할 만큼 안정된 사실이나 구현 근거가 있을 때만 만든다.
- 불확실한 아이디어는 계획 문서로 만들지 않고 회의록에 발화 맥락과 함께 둔다.
- API, 배포, 테스트, ML, 화면처럼 아직 실체가 없는 영역은 별도 문서로 만들지 않는다.
- 문서에는 추정과 확정을 구분해서 쓴다.
- 본문은 한국어를 기본으로 쓰고, 코드/파일명/명령어는 영어로 쓴다.
- 링크는 현재 파일 기준 상대경로를 사용한다.

## Git

- 사용자가 요청할 때만 커밋한다.
- 기존 사용자 변경을 되돌리지 않는다.
- 한 커밋은 하나의 논리적 변경에 맞춘다.
