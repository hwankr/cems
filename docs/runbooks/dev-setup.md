# Dev Setup

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run lint
npm run build
```

현재 `test` script는 없다.

## Stack

| 항목 | 값 |
| --- | --- |
| Next.js | 16.2.9 |
| React | 19.2.4 |
| TypeScript | 5 |
| Tailwind CSS | v4 |
| ESLint | 9 |

`package.json`에 `engines`가 없으므로 Node.js 최소 버전은 아직 고정하지 않았다. 일반적으로 최신 LTS를 사용한다.

## Next.js 16 Rule

이 저장소의 Next.js는 학습 데이터 기준 Next.js와 다를 수 있다. 라우팅, Route Handler, metadata, Server/Client Component, 캐싱, 환경변수 동작을 단정하지 말고 코드 작성 전 `node_modules/next/dist/docs/`의 관련 문서를 읽는다.

## ML 환경

Python/LightGBM/SHAP 환경은 아직 없다. ML 코드가 생기면 Python 버전, 가상환경, 의존성 파일, 실행 명령을 이 문서에 추가한다.
