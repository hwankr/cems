# Data / ML

데이터와 모델은 아직 구현되지 않았다. 이 문서는 PoC를 시작하기 위한 최소 설계 메모다.

## 목표 파이프라인

```text
raw kWh time series
  -> feature engineering
  -> LightGBM quantile forecast
  -> SHAP explanation
  -> LLM coaching input
```

## 입력 데이터

| 항목 | 필요 |
| --- | --- |
| 사용량 | `timestamp`, `kWh` |
| 식별자 | 건물/공간 ID가 필요한지 결정 |
| 시간 정보 | hour, day-of-week, holiday 후보 |
| 외생 변수 | 날씨, 운영 일정, 점유율 후보 |

가장 먼저 실제 데이터 한 샘플과 컬럼 명세가 필요하다. 데이터가 없으면 피처, 평가, API 계약을 확정하지 않는다.

## 모델

- 주 후보: LightGBM 분위수 회귀.
- 출력 후보: P10, P50, P90.
- 비교 후보: LSTM. MVP에서는 우선순위를 낮춘다.

## 평가

| 항목 | 후보 지표 |
| --- | --- |
| 점 예측 | MAE, MAPE |
| 분위수 예측 | Pinball loss, P10/P90 coverage |
| 절감 효과 | `(기준선 - 실제) / 기준선` |
| 설명/코칭 | SHAP 방향성과 LLM 응답의 근거성 수동 리뷰 |

기준선 정의와 train/valid/test 분할 방식은 아직 미정이다.

## 단위 환산

- 비용: 약 150원/kWh로 추정. 공식 요금표 확인 필요.
- 탄소: 약 0.4173 tCO2eq/MWh로 추정. 공식 출처 확인 필요.
- TOE: 약 11,630 kWh/TOE로 보되 공식 기준 확인 필요.

추정값은 UI 표시 후보일 뿐이며, 확정 전에는 핵심 모델 로직에 고정하지 않는다.

## PoC 순서

1. 데이터 샘플과 컬럼 명세 확보.
2. 시간 기준 정렬과 결측 처리 방식 결정.
3. 단순 baseline 모델을 먼저 만든다.
4. LightGBM P50 예측을 검증한다.
5. P10/P90과 SHAP을 추가한다.
6. SHAP 요약을 LLM 코칭 입력으로 바꾼다.

관련 문서: [architecture overview](overview.md), [PRD](../product/prd.md), [glossary](../overview/glossary.md).
