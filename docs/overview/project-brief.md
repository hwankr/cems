# Project Brief — cems

## 한 줄 요약

cems(C-EMS, Competition Energy Management System)는 건물/캠퍼스의 에너지 사용량을 예측하고, 예측 이유를 설명하며, 절감 코칭을 제공하는 대회용 프로토타입이다.

## 배경

- 목표 대회: HUSS 융합캠프 2026 AI 경진대회, 주관 Social AI Lab.
- 컨셉: 에너지 절감 경진. 사용량 예측, 절감 여지 설명, 자연어 코칭을 하나의 흐름으로 보여준다.
- 현재 계획서 세부는 불확실하다. 원본 PDF의 한글 텍스트 추출이 깨져 기능 목록, 점수식, 데이터 스키마, 화면 구성은 확정하지 않는다.

## 현재 확정된 큰 줄기

| 영역 | 현재 기준 |
| --- | --- |
| 주 입력 | 건물/캠퍼스 에너지 사용량 시계열, 단위 `kWh` |
| 예측 | LightGBM 기반 사용량 예측, P10/P50/P90 분위수 후보 |
| 설명 | SHAP 기반 예측 요인 설명 |
| 코칭 | LLM 기반 자연어 절감 제안 |
| 보조 지표 | 비용, `tCO2`, TOE 환산 후보 |
| 프론트엔드 | Next.js 16.2.9, React 19, Tailwind CSS v4 |

추정 수치: 전기요금 약 150원/kWh, 탄소배출계수 약 0.4173 tCO2eq/MWh. 실제 적용 전 공식 출처 확인이 필요하다.

## 현재 저장소 상태

- Next.js 기본 스캐폴드만 있다.
- 제품 UI, API, ML, 데이터 파이프라인, 배포 설정은 아직 없다.
- 문서는 과한 분류를 줄인 lean handbook 형태로 정리했다.

## 바로 필요한 결정

1. 1차 타깃 사용자 한 명을 정한다.
2. 사용할 데이터 소스와 최소 스키마를 정한다.
3. 대회 계획서에서 채점 기준과 필수 기능을 다시 확인한다.
4. 그 다음 [product/prd.md](../product/prd.md)와 [architecture/data-ml.md](../architecture/data-ml.md)를 확정 정보로 갱신한다.

용어는 [glossary.md](glossary.md)를 참고한다.
