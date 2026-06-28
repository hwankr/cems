import type { AwardTier } from "@/features/leagues/domain/types";
import { getInventoryQuantity, increaseInventory } from "./inventory";
import type { EstateItemDefinition, EstateSnapshot } from "./types";

export const AWARD_EMBLEM_PREFIX = "award-emblem-";

export function awardEmblemDefinitionId(tier: AwardTier): string {
  return `${AWARD_EMBLEM_PREFIX}${tier}`;
}

function emblemDefinition(tier: AwardTier): EstateItemDefinition {
  const id = awardEmblemDefinitionId(tier);
  return {
    id,
    nameKey: id,
    descriptionKey: id,
    category: "landmark",
    cost: 0,
    footprintWidth: 1,
    footprintHeight: 1,
    canRotate: false,
    assetId: id,
    placementRule: "land",
  };
}

export const awardEmblemDefinitions: readonly EstateItemDefinition[] = [
  emblemDefinition("gold"),
  emblemDefinition("silver"),
  emblemDefinition("bronze"),
];

export function awardEmblemDefinitionById(
  definitionId: string,
): EstateItemDefinition | null {
  return awardEmblemDefinitions.find((def) => def.id === definitionId) ?? null;
}

/**
 * If a winner emblem is granted and the estate neither already owns (inventory)
 * nor has placed it, inject exactly one into inventory so it can be placed
 * through the normal inventory → place flow. Otherwise returns the snapshot
 * unchanged (referentially equal when nothing is granted).
 */
export function applyEmblemGrant(
  snapshot: EstateSnapshot,
  grantedDefinitionId: string | null,
): EstateSnapshot {
  if (!grantedDefinitionId) return snapshot;

  const placed = snapshot.items.some(
    (item) => item.definitionId === grantedDefinitionId,
  );
  const owned =
    getInventoryQuantity(snapshot.inventory, grantedDefinitionId) > 0;
  if (placed || owned) return snapshot;

  return {
    ...snapshot,
    inventory: increaseInventory(snapshot.inventory, grantedDefinitionId, 1),
  };
}
