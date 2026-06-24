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

export function createDemoEstateSeedSnapshot(subjectId: string): EstateSnapshot {
  const items =
    subjectId === "yu-e21"
      ? createYuE21SeedItems()
      : createGenericBuildingSeedItems(subjectId);

  return {
    schemaVersion: 1,
    subjectId,
    unlockedParcelIds: ["central-campus"],
    items,
    inventory: [],
    groundTiles: createSeedGroundTiles(subjectId),
    transactions: [],
    updatedAt: seedTimestamp,
  };
}

function createYuE21SeedItems(): EstateItemInstance[] {
  return [
    createSeedItem("yu-e21:landmark", baseEstateBuildingDefinition.id, 3, 3),
    createSeedItem("yu-e21:tree:0", "broadleaf-tree", 1, 1),
    createSeedItem("yu-e21:tree:1", "pine-tree", 6, 1),
    createSeedItem("yu-e21:tree:2", "broadleaf-tree", 1, 6),
  ];
}

function createGenericBuildingSeedItems(subjectId: string): EstateItemInstance[] {
  const random = createDeterministicPrng(subjectId);
  const occupied = new Set(["3:3", "3:4", "4:3", "4:4"]);
  const items: EstateItemInstance[] = [
    createSeedItem(
      `${subjectId}:landmark`,
      baseEstateBuildingDefinition.id,
      3,
      3,
    ),
  ];

  for (let index = 0; index < 3; index += 1) {
    const position = nextOpenSeedPosition(random, occupied);
    const definitionId = index % 2 === 0 ? "broadleaf-tree" : "pine-tree";
    items.push(
      createSeedItem(
        `${subjectId}:tree:${index}`,
        definitionId,
        position.x,
        position.y,
      ),
    );
  }

  return items;
}

function createSeedGroundTiles(subjectId: string): EstateGroundTile[] {
  if (subjectId === "yu-e21") {
    return [
      { x: 3, y: 5, definitionId: "bright-sidewalk-block" },
      { x: 4, y: 5, definitionId: "bright-sidewalk-block" },
      { x: 3, y: 6, definitionId: "bright-sidewalk-block" },
      { x: 4, y: 6, definitionId: "bright-sidewalk-block" },
      { x: 3, y: 7, definitionId: "stone-path" },
      { x: 4, y: 7, definitionId: "stone-path" },
    ];
  }

  return [
    { x: 3, y: 5, definitionId: "stone-path" },
    { x: 4, y: 5, definitionId: "stone-path" },
    { x: 3, y: 6, definitionId: "stone-path" },
    { x: 4, y: 6, definitionId: "stone-path" },
  ];
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

function nextOpenSeedPosition(
  random: () => number,
  occupied: Set<string>,
): { x: number; y: number } {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const x = Math.floor(random() * 8);
    const y = Math.floor(random() * 8);
    const key = `${x}:${y}`;

    if (!occupied.has(key)) {
      occupied.add(key);
      return { x, y };
    }
  }

  return { x: 0, y: 0 };
}

function createDeterministicPrng(seedText: string): () => number {
  let state = 2166136261;

  for (const character of seedText) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
