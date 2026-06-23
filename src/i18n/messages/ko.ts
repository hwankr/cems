export const koMessages = {
  admin: {
    actualForecastLine: "실제 {actual} / 예측 {forecast}",
    buildingDiagnosis: "건물 진단",
    metrics: {
      actual: "실제",
      forecast: "예측",
      overuse: "초과 사용",
      saved: "절감",
    },
    selectedDeltaAbove: "실제 사용량이 예측보다 {value} 높습니다.",
    selectedDeltaBelow: "실제 사용량이 예측보다 {value} 낮습니다.",
    selectedSubject: "선택된 대상",
  },
  app: {
    brandName: "CEMS",
    description: "예측 기준선과 실제 전력 사용량을 비교합니다.",
    eyebrow: "캠퍼스 에너지 관리 시스템",
    language: {
      label: "언어",
      options: {
        en: "English",
        ko: "한국어",
      },
    },
  },
  character: {
    level: "레벨 {level}",
    nextLevel: "{current} / {next}점, 다음 레벨까지",
    titles: {
      campusSaver: "캠퍼스 절약가",
      energyHero: "에너지 히어로",
      gridGuardian: "그리드 가디언",
    },
    totalPoints: "총 에너지 포인트 {points}",
  },
  demo: {
    groups: {
      engineering: "공과대학",
      humanities: "문과대학",
      "student-services": "학생지원",
    },
    participant: {
      displayName: "데모 학생",
    },
    school: {
      name: "영남대학교",
      shortName: "YU",
    },
    subjects: {
      "yu-humanities": {
        name: "인문관",
        shortName: "인문",
      },
      "yu-it": {
        name: "IT관",
        shortName: "IT",
      },
      "yu-library": {
        name: "중앙도서관",
        shortName: "도서관",
      },
      "yu-mechanical": {
        name: "기계공학관",
        shortName: "기계",
      },
    },
  },
  map: {
    live: "실시간 캠퍼스",
    missingTokenDescription:
      ".env.local에 NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN을 설정하세요.",
    missingTokenTitle: "Mapbox 토큰이 필요합니다",
  },
  modes: {
    admin: "관리자 대시보드",
    participant: "참여자 모드",
  },
  participant: {
    affiliationRanking: "소속 순위",
    myAffiliation: "내 소속",
    myPoints: "내 포인트",
    pointsDescription: "예측 기준선보다 절감한 전력량이 포인트로 전환됩니다.",
    rank: "순위",
    savedEnergy: "절감 에너지",
    savedLine: "{value} 절감",
    unassigned: "소속 없음",
  },
  status: {
    neutral: "보통",
    overuse: "초과",
    saving: "절감",
  },
} as const;
