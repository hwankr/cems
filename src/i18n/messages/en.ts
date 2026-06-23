import type { Messages } from "./types";

export const enMessages = {
  admin: {
    actualForecastLine: "Actual {actual} / Forecast {forecast}",
    buildingDiagnosis: "Building diagnosis",
    metrics: {
      actual: "Actual",
      forecast: "Forecast",
      overuse: "Overuse",
      saved: "Saved",
    },
    selectedDeltaAbove: "Actual usage is {value} above forecast.",
    selectedDeltaBelow: "Actual usage is {value} below forecast.",
    selectedSubject: "Selected subject",
  },
  app: {
    brandName: "CEMS",
    description: "Actual electricity usage compared with forecast baseline.",
    eyebrow: "Campus Energy Management System",
    language: {
      label: "Language",
      options: {
        en: "English",
        ko: "한국어",
      },
    },
    theme: {
      dark: "Dark",
      label: "Theme",
      light: "Light",
      system: "System",
    },
  },
  character: {
    level: "Level {level}",
    nextLevel: "{current} / {next} points to next level",
    titles: {
      campusSaver: "Campus Saver",
      energyHero: "Energy Hero",
      gridGuardian: "Grid Guardian",
    },
    totalPoints: "{points} total energy points",
  },
  demo: {
    groups: {
      engineering: "College of Engineering",
      humanities: "College of Humanities",
      "student-services": "Student Services",
    },
    participant: {
      displayName: "Demo Student",
    },
    school: {
      name: "Yeungnam University",
      shortName: "YU",
    },
    subjects: {
      "yu-humanities": {
        name: "Humanities Building",
        shortName: "HM",
      },
      "yu-it": {
        name: "IT Building",
        shortName: "IT",
      },
      "yu-library": {
        name: "University Library",
        shortName: "LIB",
      },
      "yu-mechanical": {
        name: "Mechanical Engineering Building",
        shortName: "ME",
      },
    },
  },
  map: {
    live: "Live campus",
    missingTokenDescription: "Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local.",
    missingTokenTitle: "Mapbox token required",
  },
  modes: {
    admin: "Admin Dashboard",
    participant: "Participant Mode",
  },
  participant: {
    affiliationRanking: "Affiliation ranking",
    myAffiliation: "My affiliation",
    myPoints: "My points",
    pointsDescription:
      "Points come from electricity saved against the forecast baseline.",
    rank: "Rank",
    savedEnergy: "Saved energy",
    savedLine: "{value} saved",
    unassigned: "Unassigned",
  },
  status: {
    neutral: "neutral",
    overuse: "overuse",
    saving: "saving",
  },
} as const satisfies Messages;
