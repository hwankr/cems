# Architecture Decision Records

되돌리기 어렵거나 나중에 이유를 잊기 쉬운 결정만 ADR로 남긴다.

## 작성 기준

ADR을 쓰는 경우:

- 기술 스택이나 런타임 경계를 고를 때
- 데이터 모델, API 경계, 배포 방식처럼 바꾸기 비용이 큰 결정을 할 때
- 여러 대안을 비교하고 하나를 채택할 때

ADR을 쓰지 않는 경우:

- 파일명, 변수명, 작은 구현 취향
- 언제든 쉽게 바꿀 수 있는 임시 선택
- `TBD`를 적기 위한 문서

## 파일 규칙

```text
docs/architecture/decisions/NNNN-short-title.md
```

새 ADR은 [0001-template.md](0001-template.md)를 복사해서 작성한다.

## 목록

| 번호 | 제목 | 상태 | 링크 |
| --- | --- | --- | --- |
| 0001 | ADR 템플릿 | 채택 | [0001-template.md](0001-template.md) |
| 0002 | Lean docs 핸드북 채택 | 채택 | [0002-docs-handbook-structure.md](0002-docs-handbook-structure.md) |
