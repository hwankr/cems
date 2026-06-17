# cems

cems(C-EMS, Competition Energy Management System)는 건물/캠퍼스 에너지 사용량을 예측하고, 예측 이유와 절감 코칭을 보여주는 대회용 프로토타입이다.

현재는 Next.js 기본 스캐폴드와 문서만 있다. 제품 UI, API, ML, 데이터 파이프라인은 아직 구현되지 않았다.

## Docs

작업을 시작하기 전에 [docs/working/current-state.md](docs/working/current-state.md)를 먼저 읽는다. 전체 문서 지도는 [docs/README.md](docs/README.md)에 있다.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

코드를 작성하기 전에는 루트 [AGENTS.md](AGENTS.md) 규칙에 따라 `node_modules/next/dist/docs/`의 관련 Next.js 16 문서를 확인한다.
