# Current State — cems

**마지막 업데이트: 2026-06-17**

## 현재 상태

Next.js 16 기본 스캐폴드와 lean docs 핸드북만 있다. 제품 UI, API, ML, 데이터 파이프라인, 배포 설정은 아직 구현되지 않았다.

## 동작하는 것

- `package.json`에 `dev`, `build`, `start`, `lint` scripts가 있다.
- 기본 스캐폴드 파일이 있다: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/favicon.ico`.
- 문서 진입점은 [../README.md](../README.md)이고, 유지 규칙은 [../contributing.md](../contributing.md)에 있다.

## 최근 정리

- 과하게 나뉘었던 docs 구조를 줄였다.
- 아직 구현 근거가 없는 API 계약, 배포 절차, 테스트 전략, 별도 사용자 흐름, 상세 frontend 문서는 제거했다.
- 필요한 내용은 [project-brief](../overview/project-brief.md), [prd](../product/prd.md), [architecture overview](../architecture/overview.md), [data-ml](../architecture/data-ml.md), [dev setup](../runbooks/dev-setup.md)에 흡수했다.

## 리스크

- 원본 계획서 PDF의 한글 추출이 깨져 세부 기능, 점수식, 데이터 스키마, 화면 구성은 불확실하다.
- 데이터 소스가 없어 ML/API 설계를 확정할 수 없다.
- Next.js 16은 기존 지식과 다를 수 있으므로 코드 작성 전 `node_modules/next/dist/docs/` 확인이 필요하다.

## 다음 할 일

1. 1차 사용자와 데모 시나리오를 정해 [../product/prd.md](../product/prd.md)를 구체화한다.
2. 사용할 데이터 소스와 최소 컬럼을 확보한다.
3. 기본 랜딩을 cems용 첫 화면으로 바꾸기 전 Next.js 16 문서를 확인한다.
4. 데이터가 생기면 LightGBM P50 baseline부터 PoC를 시작한다.

전체 작업 후보는 [backlog.md](backlog.md)에 둔다.
