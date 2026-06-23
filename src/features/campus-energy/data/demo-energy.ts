import { resolveBuildingFloors } from "../domain/building-detail";
import { hashString } from "../domain/hash";
import type { EnergyReading, EnergySubject } from "../domain/types";

const DEMO_PERIOD_LABEL = "2026-W25";

/**
 * A subject that renders as a clickable 3D building on the map: a polygon with a
 * positive display height. Point fallbacks and zero-height polygons are not
 * clickable, so they get no synthesized reading.
 */
export function isClickableBuildingSubject(subject: EnergySubject): boolean {
  const geometry = subject.geometry;
  return (
    !!geometry &&
    geometry.type !== "Point" &&
    typeof geometry.displayHeightMeters === "number" &&
    geometry.displayHeightMeters > 0
  );
}

/**
 * Demo seam: returns the hand-authored readings plus deterministically
 * synthesized readings for every other clickable building, so the map shows a
 * rich saving/overuse mix instead of a few colored buildings. Authored readings
 * always win. Replace this generator when real ingestion lands.
 */
export function generateDemoEnergyReadings(
  subjects: EnergySubject[],
  authoredReadings: EnergyReading[],
): EnergyReading[] {
  const authoredIds = new Set(
    authoredReadings.map((reading) => reading.subjectId),
  );
  const generated = subjects
    .filter(isClickableBuildingSubject)
    .filter((subject) => !authoredIds.has(subject.id))
    .map((subject) => synthesizeReading(subject));

  return [...authoredReadings, ...generated];
}

function synthesizeReading(subject: EnergySubject): EnergyReading {
  const seed = hashString(subject.id);
  const floors = resolveBuildingFloors(subject);
  // Magnitude scales with building size so larger buildings draw more.
  const forecastKwh = 220 + floors * 130 + (seed % 520);
  // ~1 in 9 buildings sits on forecast (neutral); the rest land in 0.80–1.20.
  const neutral = seed % 9 === 0;
  const ratio = neutral ? 1 : 0.8 + ((seed >>> 5) % 41) / 100;
  const actualKwh = Math.round(forecastKwh * ratio);

  return {
    subjectId: subject.id,
    actualKwh,
    forecastKwh,
    periodLabel: DEMO_PERIOD_LABEL,
  };
}
