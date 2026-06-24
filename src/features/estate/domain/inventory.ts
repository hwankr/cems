import type { EstateInventoryEntry } from "./types";

export function getInventoryQuantity(
  inventory: readonly EstateInventoryEntry[],
  definitionId: string,
): number {
  return (
    inventory.find((entry) => entry.definitionId === definitionId)?.quantity ?? 0
  );
}

export function increaseInventory(
  inventory: readonly EstateInventoryEntry[],
  definitionId: string,
  quantity = 1,
): EstateInventoryEntry[] {
  const safeQuantity = Math.max(0, Math.floor(quantity));

  if (safeQuantity === 0) return [...inventory];

  const existingQuantity = getInventoryQuantity(inventory, definitionId);
  const nextEntry = {
    definitionId,
    quantity: existingQuantity + safeQuantity,
  };
  const withoutExisting = inventory.filter(
    (entry) => entry.definitionId !== definitionId,
  );

  return [...withoutExisting, nextEntry].sort((a, b) =>
    a.definitionId.localeCompare(b.definitionId),
  );
}

export function decreaseInventory(
  inventory: readonly EstateInventoryEntry[],
  definitionId: string,
  quantity = 1,
): EstateInventoryEntry[] {
  const safeQuantity = Math.max(0, Math.floor(quantity));
  const existingQuantity = getInventoryQuantity(inventory, definitionId);
  const nextQuantity = Math.max(0, existingQuantity - safeQuantity);

  return inventory
    .map((entry) =>
      entry.definitionId === definitionId
        ? { ...entry, quantity: nextQuantity }
        : { ...entry },
    )
    .filter((entry) => entry.quantity > 0)
    .sort((a, b) => a.definitionId.localeCompare(b.definitionId));
}
