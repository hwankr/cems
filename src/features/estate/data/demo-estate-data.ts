import { baseEstateBuildingDefinition } from "./estate-item-catalog";
import type {
  EstateGroundTile,
  EstateItemInstance,
  EstateSnapshot,
} from "../domain/types";

export type DemoHistoricalEarnedPointsBySubjectId = Readonly<
  Partial<Record<string, number>>
>;

// Demo-only carryover until a server API can return verified long-term accounts.
export const demoHistoricalEarnedPointsBySubjectId: DemoHistoricalEarnedPointsBySubjectId =
  {
    "yu-e21": 3200,
  };

const seedTimestamp = "2026-06-24T00:00:00.000Z";

// A designed starter garden inside the central 8x8 parcel: a landmark at the
// back, a paved axis leading to a fountain focal, trees framing the corners,
// and benches, flower beds, and lamps lining the courtyard. Every fresh estate
// already reads as a small finished campus garden before the player decorates.
// Footprints are pre-checked to fit 0..7 with no item collisions.
type SeedItemPlacement = {
  suffix: string;
  definitionId: string;
  x: number;
  y: number;
};

const gardenSeedItems: readonly SeedItemPlacement[] = [
  { suffix: "landmark", definitionId: baseEstateBuildingDefinition.id, x: 7, y: 4 },
  { suffix: "fountain", definitionId: "fountain", x: 7, y: 10 },
  { suffix: "tree-back-left", definitionId: "pine-tree", x: 2, y: 2 },
  { suffix: "tree-back-right", definitionId: "broadleaf-tree", x: 13, y: 2 },
  { suffix: "tree-front-left", definitionId: "broadleaf-tree", x: 2, y: 13 },
  { suffix: "tree-front-right", definitionId: "pine-tree", x: 13, y: 13 },
  { suffix: "tree-mid-left", definitionId: "broadleaf-tree", x: 2, y: 8 },
  { suffix: "tree-mid-right", definitionId: "pine-tree", x: 13, y: 8 },
  { suffix: "tree-back-c-left", definitionId: "pine-tree", x: 5, y: 2 },
  { suffix: "tree-back-c-right", definitionId: "broadleaf-tree", x: 10, y: 2 },
  { suffix: "tree-front-c-left", definitionId: "broadleaf-tree", x: 5, y: 13 },
  { suffix: "tree-front-c-right", definitionId: "pine-tree", x: 10, y: 13 },
  { suffix: "bench-left", definitionId: "bench", x: 4, y: 7 },
  { suffix: "bench-right", definitionId: "bench", x: 10, y: 7 },
  { suffix: "flowers-left", definitionId: "flower-bed", x: 4, y: 10 },
  { suffix: "flowers-right", definitionId: "flower-bed", x: 10, y: 10 },
  { suffix: "lamp-left", definitionId: "solar-street-light", x: 5, y: 5 },
  { suffix: "lamp-right", definitionId: "solar-street-light", x: 10, y: 5 },
  { suffix: "shrub-back-left", definitionId: "decorative-shrub", x: 3, y: 4 },
  { suffix: "shrub-back-right", definitionId: "decorative-shrub", x: 12, y: 4 },
  { suffix: "shrub-front-left", definitionId: "decorative-shrub", x: 3, y: 12 },
  { suffix: "shrub-front-right", definitionId: "decorative-shrub", x: 12, y: 12 },
  { suffix: "sculpture", definitionId: "small-sculpture", x: 7, y: 13 },
];

// Paved axis running from the landmark entrance down to the fountain, plus a
// short approach in front of it. All tiles sit on item-free cells so they stay
// visible inside the larger 16x16 core.
const gardenSeedGroundTiles: readonly EstateGroundTile[] = [
  { x: 7, y: 6, definitionId: "bright-sidewalk-block" },
  { x: 8, y: 6, definitionId: "bright-sidewalk-block" },
  { x: 7, y: 7, definitionId: "bright-sidewalk-block" },
  { x: 8, y: 7, definitionId: "bright-sidewalk-block" },
  { x: 7, y: 8, definitionId: "bright-sidewalk-block" },
  { x: 8, y: 8, definitionId: "bright-sidewalk-block" },
  { x: 7, y: 9, definitionId: "bright-sidewalk-block" },
  { x: 8, y: 9, definitionId: "bright-sidewalk-block" },
  { x: 7, y: 12, definitionId: "stone-path" },
  { x: 8, y: 12, definitionId: "stone-path" },
];

export function createDemoEstateSeedSnapshot(subjectId: string): EstateSnapshot {
  return {
    schemaVersion: 2,
    subjectId,
    mainBuildingLevel: 1,
    unlockedParcelIds: ["central-campus"],
    items: createGardenSeedItems(subjectId),
    inventory: [],
    groundTiles: createGardenGroundTiles(),
    transactions: [],
    updatedAt: seedTimestamp,
  };
}

function createGardenSeedItems(subjectId: string): EstateItemInstance[] {
  return gardenSeedItems.map((placement) =>
    createSeedItem(
      `${subjectId}:${placement.suffix}`,
      placement.definitionId,
      placement.x,
      placement.y,
    ),
  );
}

function createGardenGroundTiles(): EstateGroundTile[] {
  return gardenSeedGroundTiles.map((tile) => ({ ...tile }));
}

function createSeedItem(
  id: string,
  definitionId: string,
  x: number,
  y: number,
): EstateItemInstance {
  return {
    id,
    definitionId,
    x,
    y,
    rotation: 0,
    placedAt: seedTimestamp,
  };
}
