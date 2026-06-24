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
    theme: {
      dark: "다크",
      label: "테마",
      light: "라이트",
      system: "시스템",
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
  estate: {
    title: "건물 영지",
    backToMap: "지도 화면으로 돌아가기",
    earnedPoints: "적립 포인트",
    spentPoints: "사용 포인트",
    availablePoints: "사용 가능 포인트",
    savedEnergy: "현재 절감량",
    loading: "영지 데이터를 불러오는 중",
    unavailable: "확인 불가",
    enginePlaceholder: "영지 엔진 준비 중",
    officialCode: "공식 코드",
  },
  map: {
    live: "실시간 캠퍼스",
    missingTokenDescription:
      ".env.local에 NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN을 설정하세요.",
    missingTokenTitle: "Mapbox 토큰이 필요합니다",
  },
  mapView: {
    brandTitle: "캠퍼스 에너지",
    brandSubtitle: "실시간 전력 모니터링",
    searchPlaceholder: "건물 검색",
    campusSelectLabel: "캠퍼스 선택",
    summaryRealtime: "캠퍼스 실시간",
    summaryNetSaving: "예측 대비 순절감",
    rankTitle: "건물 절감 순위",
    controls: {
      zoomIn: "확대",
      zoomOut: "축소",
      resetView: "기본 보기",
      heatmap: "사용량 히트맵",
      labels: "건물명 표시",
      settings: "지도 설정",
    },
    settings: {
      title: "지도 설정",
      theme: "테마",
      language: "언어",
      mode: "모드",
    },
    popup: {
      realtimeUsage: "실시간 사용량",
      vsForecast: "예측 대비",
      hourlyTitle: "시간대별 사용량 · 오늘",
      nowReference: "{time} 기준",
      hourTick: "{hour}시",
      scale: "규모",
      floorsValue: "{floors}층",
      area: "연면적",
      completion: "준공",
      close: "닫기",
      openEstate: "영지 이동",
      noData: "데이터 없음",
    },
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
