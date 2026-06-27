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
// 16x16 core, on bare grass. Players grow the estate by upgrading the building
// and buying decorations from the shop. The 2x2 footprint at (7,7) covers
// cells (7..8, 7..8), centered in the 0..15 core.
export function createDemoEstateSeedSnapshot(subjectId: string): EstateSnapshot {
  return {
    schemaVersion: 2,
    subjectId,
    mainBuildingLevel: 1,
    unlockedParcelIds: ["central-campus"],
    items: [
      {
        id: `${subjectId}:landmark`,
        definitionId: baseEstateBuildingDefinition.id,
        x: 7,
        y: 7,
        rotation: 0,
        placedAt: seedTimestamp,
      },
    ],
    inventory: [],
    groundTiles: [],
    transactions: [],
    updatedAt: seedTimestamp,
  };
}
