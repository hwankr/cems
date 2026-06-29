import { baseEstateBuildingDefinition } from "./estate-item-catalog";
import type { EstateSnapshot } from "../domain/types";

export type DemoHistoricalEarnedPointsBySubjectId = Readonly<
  Partial<Record<string, number>>
>;

// Demo-only carryover until a server API can return verified long-term accounts.
export const demoHistoricalEarnedPointsBySubjectId: DemoHistoricalEarnedPointsBySubjectId =
  {
    "yu-e21": 3200,
  };

const seedTimestamp = "2026-06-24T00:00:00.000Z";

// A fresh estate starts clean: a single level-1 main building centered in the
// 15x15 core, on bare grass. Players grow the estate by upgrading the building
// and buying decorations from the shop. The 3x3 footprint at (6,6) covers
// cells (6..8, 6..8), centered in the 0..14 core.
export function createDemoEstateSeedSnapshot(subjectId: string): EstateSnapshot {
  return {
    schemaVersion: 3,
    subjectId,
    mainBuildingLevel: 1,
    unlockedParcelIds: ["central-campus"],
    items: [
      {
        id: `${subjectId}:landmark`,
        definitionId: baseEstateBuildingDefinition.id,
        x: 6,
        y: 6,
        rotation: 0,
        placedAt: seedTimestamp,
      },
    ],
    inventory: [],
    groundTiles: [],
    transactions: [],
    ecoCredits: 0,
    ecoCollectedAt: seedTimestamp,
    updatedAt: seedTimestamp,
  };
}
