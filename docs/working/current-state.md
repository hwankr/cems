# Current State — cems

**마지막 업데이트: 2026-06-19**

## 현재 문맥

기존 제품/ML/아키텍처 기획 문서는 제거했다. 프로젝트 방향이 바뀔 수 있으므로, 새 세션은 오래된 계획을 기준으로 삼지 않고 [meeting-notes.md](meeting-notes.md)에 누적된 사용자 발화와 확인된 사실만 참고한다.

## 실제 저장소 상태

- Next.js 16.2.9, React 19, TypeScript, Tailwind CSS v4 기반 스캐폴드가 있다.
- `package.json`에 `dev`, `build`, `start`, `lint` scripts가 있다.
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/favicon.ico`는 create-next-app 기본 상태에 가깝다.
- 제품 UI, API, 데이터, ML, 배포 설정은 아직 구현하지 않았다.

## 세션 시작 규칙

1. 이 파일을 먼저 읽는다.
2. [meeting-notes.md](meeting-notes.md)를 읽는다.
3. 사용자가 새로 말한 내용과 작업 중 확인한 사실만 docs에 누적한다.
4. Next.js 코드를 수정하기 전에는 `node_modules/next/dist/docs/`의 관련 문서를 확인한다.

## 기록 트리거

사용자가 `정리 시작`, `세션 정리해줘`, `기록해줘`, `회의록 정리해줘`처럼 말하면 기록 모드로 전환한다. 기록 모드는 현재 대화와 작업 결과를 확인해 [meeting-notes.md](meeting-notes.md)에 날짜별로 추가하는 수동 트리거 방식이다.
