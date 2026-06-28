import { describe, expect, it } from "vitest";
import {
  applyEmblemGrant,
  awardEmblemDefinitionById,
  awardEmblemDefinitionId,
  awardEmblemDefinitions,
} from "../domain/award-emblem";
import { createDemoEstateSeedSnapshot } from "../data/demo-estate-data";

describe("award emblem definitions", () => {
  it("derives the definition id from a tier", () => {
    expect(awardEmblemDefinitionId("gold")).toBe("award-emblem-gold");
    expect(awardEmblemDefinitionId("silver")).toBe("award-emblem-silver");
    expect(awardEmblemDefinitionId("bronze")).toBe("award-emblem-bronze");
  });

  it("exposes one zero-cost definition per tier", () => {
    expect(awardEmblemDefinitions).toHaveLength(3);
    for (const def of awardEmblemDefinitions) {
      expect(def.cost).toBe(0);
      expect(def.id).toMatch(/^award-emblem-(gold|silver|bronze)$/);
      expect(def.assetId).toBe(def.id);
    }
  });

  it("looks up a definition by id, or null", () => {
    expect(awardEmblemDefinitionById("award-emblem-gold")?.id).toBe(
      "award-emblem-gold",
    );
    expect(awardEmblemDefinitionById("nope")).toBeNull();
  });
});

describe("applyEmblemGrant", () => {
  const base = createDemoEstateSeedSnapshot("yu-b04");

  it("returns the snapshot unchanged when nothing is granted", () => {
    expect(applyEmblemGrant(base, null)).toBe(base);
  });

  it("injects one emblem into inventory when granted and not owned/placed", () => {
    const next = applyEmblemGrant(base, "award-emblem-gold");
    const entry = next.inventory.find(
      (e) => e.definitionId === "award-emblem-gold",
    );
    expect(entry?.quantity).toBe(1);
  });

  it("does not duplicate when already in inventory", () => {
    const withEmblem = {
      ...base,
      inventory: [{ definitionId: "award-emblem-gold", quantity: 1 }],
    };
    const next = applyEmblemGrant(withEmblem, "award-emblem-gold");
    const total = next.inventory
      .filter((e) => e.definitionId === "award-emblem-gold")
      .reduce((sum, e) => sum + e.quantity, 0);
    expect(total).toBe(1);
  });

  it("does not re-grant when the emblem is already placed", () => {
    const withPlaced = {
      ...base,
      items: [
        ...base.items,
        {
          id: "placed-emblem",
          definitionId: "award-emblem-gold",
          x: 10,
          y: 10,
          rotation: 0 as const,
          placedAt: "2026-05-15T00:00:00.000Z",
        },
      ],
    };
    const next = applyEmblemGrant(withPlaced, "award-emblem-gold");
    expect(
      next.inventory.find((e) => e.definitionId === "award-emblem-gold"),
    ).toBeUndefined();
  });
});
