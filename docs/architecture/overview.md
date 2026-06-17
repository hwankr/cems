# Architecture Overview

현재 저장소에는 Next.js 기본 스캐폴드만 있다. 아래 구조는 목표 방향이며, 실제 API/서비스 경계는 데이터와 ML PoC 이후 확정한다.

## 현재 코드

| 파일 | 상태 |
| --- | --- |
| `src/app/layout.tsx` | 기본 RootLayout. `lang="en"`과 기본 metadata가 남아 있다. |
| `src/app/page.tsx` | create-next-app 기본 랜딩. 제품 UI가 아니다. |
| `src/app/globals.css` | Tailwind CSS v4 기본 스타일. |
| `next.config.ts` | 커스텀 옵션 없음. |
| `package.json` | Next.js 16.2.9, React 19.2.4, Tailwind CSS v4, ESLint 9. |

코드를 수정하기 전에는 `node_modules/next/dist/docs/`에서 해당 Next.js 16 가이드를 확인한다.

## 목표 흐름

```text
에너지 데이터(kWh)
  -> 피처 엔지니어링
  -> LightGBM 예측(P10/P50/P90)
  -> SHAP 요인 설명
  -> LLM 절감 코칭
  -> Next.js UI 표시
```

## 컴포넌트 경계

| 영역 | 역할 | 현재 상태 |
| --- | --- | --- |
| Frontend | 예측, 설명, 코칭 결과 표시 | Next.js 스캐폴드만 있음 |
| Data/ML | 데이터 전처리, LightGBM 예측, SHAP 계산 | 미구현 |
| LLM coaching | SHAP/예측 결과를 자연어 조언으로 변환 | 미구현 |
| API boundary | Frontend와 ML/LLM 사이의 호출 계약 | 미정 |

API 계약 문서는 아직 만들지 않는다. 데이터 스키마와 ML 런타임 경계가 정해진 뒤 실제 엔드포인트가 필요할 때 작성한다.

## 열려 있는 아키텍처 결정

1. ML을 별도 Python 서비스로 둘지, Next.js 서버 쪽에서 호출할지.
2. 예측을 요청 시점에 할지, 배치로 미리 계산할지.
3. LLM 호출을 Next.js에서 직접 할지, ML/코칭 서비스로 묶을지.
4. 데이터 저장소를 파일, DB, 외부 API 중 무엇으로 둘지.

큰 결정을 내리면 [decisions/](decisions/)에 ADR로 남긴다. 데이터/ML 세부는 [data-ml.md](data-ml.md)를 참고한다.
