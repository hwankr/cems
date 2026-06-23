export type CampusPlaceKind =
  | "building"
  | "landmark"
  | "outdoor"
  | "utility";

export type EnergySubjectType =
  | CampusPlaceKind
  | "department"
  | "college"
  | "school"
  | "region";

export type EnergyStatus = "saving" | "neutral" | "overuse";

export type Coordinate = [number, number];

export type GeometrySourceKind =
  | "official-campus-map"
  | "openstreetmap"
  | "public-data"
  | "manual";

export type GeometryConfidence = "verified" | "estimated" | "needs-review";

export type FloorCountSource = "official-bFloor" | "official-fList";

export type BuildingHeightSource =
  | "official-floor-count"
  | "manual-height"
  | "osm-height"
  | "osm-building-levels";

export type GeometrySource = {
  kind: GeometrySourceKind;
  name: string;
  url?: string;
  capturedAt?: string;
};

type BuildingHeightMetadata = {
  displayHeightMeters?: number;
  aboveGroundFloors?: number;
  basementFloors?: number;
  floorCountSource?: FloorCountSource;
  heightSource?: BuildingHeightSource;
};

type PointSubjectGeometry = {
  type: "Point";
  coordinates: Coordinate;
  geometrySource: GeometrySource;
  geometryConfidence: GeometryConfidence;
};

type PolygonSubjectGeometry = {
  type: "Polygon";
  coordinates: Coordinate[][];
  geometrySource: GeometrySource;
  geometryConfidence: GeometryConfidence;
} & BuildingHeightMetadata;

type MultiPolygonSubjectGeometry = {
  type: "MultiPolygon";
  coordinates: Coordinate[][][];
  geometrySource: GeometrySource;
  geometryConfidence: GeometryConfidence;
} & BuildingHeightMetadata;

export type SubjectGeometry =
  | PointSubjectGeometry
  | PolygonSubjectGeometry
  | MultiPolygonSubjectGeometry;

export type CharacterTitleKey =
  | "campusSaver"
  | "energyHero"
  | "gridGuardian";

export type EnergySubject = {
  id: string;
  schoolId: string;
  campusId: string;
  type: EnergySubjectType;
  name: string;
  shortName: string;
  lng?: number;
  lat?: number;
  geometry?: SubjectGeometry;
  groupId?: string;
  officialCode?: string;
};

export type EnergyReading = {
  subjectId: string;
  actualKwh: number;
  forecastKwh: number;
  periodLabel: string;
};

export type EnergyComparison = EnergyReading & {
  deltaKwh: number;
  savingsKwh: number;
  overuseKwh: number;
  savingsRate: number;
  status: EnergyStatus;
};

export type EnergySummary = {
  actualKwh: number;
  forecastKwh: number;
  savingsKwh: number;
  overuseKwh: number;
  netDeltaKwh: number;
  netSavingsRate: number;
};

export type RankedEnergySubject = EnergyComparison & {
  rank: number;
  points: number;
};

export type CharacterProgress = {
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  progressRate: number;
  titleKey: CharacterTitleKey;
};

export type School = {
  id: string;
  name: string;
  shortName: string;
  center: [number, number];
  zoom: number;
  pitch: number;
};

export type AffiliationGroup = {
  id: string;
  schoolId: string;
  name: string;
  type: "college" | "department" | "dormitory" | "staff" | "other";
};

export type ParticipantProfile = {
  id: string;
  displayName: string;
  schoolId: string;
  groupId: string;
};
