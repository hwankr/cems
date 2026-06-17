# Glossary

반복해서 쓰는 용어만 둔다. 구현이나 공식 출처 확인으로 뜻이 바뀌면 이 파일을 먼저 갱신한다.

| 용어 | 뜻 |
| --- | --- |
| C-EMS | Competition Energy Management System. 에너지 절감 경진 컨셉의 프로젝트 이름. |
| EMS / BEMS | Energy Management System / Building Energy Management System. 에너지 사용량을 모니터링하거나 관리하는 시스템. |
| kWh | kilowatt-hour. 이 프로젝트의 기본 에너지 사용량 단위. |
| TOE | Ton of Oil Equivalent. 에너지원을 석유 기준으로 환산한 단위. 1 TOE는 약 11,630 kWh로 보지만 공식 기준 확인 필요. |
| tCO2 | 탄소 배출량 단위. kWh를 탄소배출계수로 환산해 표시할 때 사용. |
| 기준선 | 절감률 계산의 기준이 되는 사용량. 과거 동기간 실측을 쓸지 모델 예측값을 쓸지는 아직 미정. |
| 절감률 | `(기준선 - 실제) / 기준선`. 기준선 정의가 확정되어야 의미가 고정된다. |
| LightGBM | 주 예측 모델 후보. 빠른 트리 기반 모델이며 분위수 회귀에 사용할 수 있다. |
| 분위수 예측 | 점 예측 대신 P10/P50/P90처럼 불확실성 구간을 함께 내는 방식. |
| SHAP | 모델 예측에 각 feature가 얼마나 기여했는지 설명하는 기법. |
| LLM | 자연어 절감 코칭을 생성할 모델. Claude, ChatGPT, Gemini 등이 후보. |
| MAPE | 예측 오차 지표 후보. 실제값이 0에 가까울 때 주의가 필요하다. |
| Pinball loss | 분위수 예측 평가 지표 후보. |
| ADR | Architecture Decision Record. 되돌리기 어려운 결정을 기록하는 문서. |

추정 수치: 전기요금 약 150원/kWh, 탄소배출계수 약 0.4173 tCO2eq/MWh. 확정 전에는 코드 상수로 고정하지 않는다.
