import { describe, expect, it } from "vitest";
import { calculateEstatePointAccount } from "../domain/point-account";
import type { EstateTransaction } from "../domain/types";

describe("calculateEstatePointAccount", () => {
  it("derives earned, spent, and available points without storing earnings", () => {
    const transactions: EstateTransaction[] = [
      {
        id: "tx-item",
        kind: "purchase-item",
        pointDelta: -120,
        itemDefinitionId: "bench",
        createdAt: "2026-06-24T00:00:00.000Z",
      },
      {
        id: "tx-ref",
        kind: "purchase-item",
        pointDelta: 50,
        itemDefinitionId: "bench",
        createdAt: "2026-06-24T00:01:00.000Z",
      },
      {
        id: "tx-land",
        kind: "unlock-parcel",
        pointDelta: -300,
        parcelId: "east-yard",
        createdAt: "2026-06-24T00:02:00.000Z",
      },
    ];

    expect(calculateEstatePointAccount(1_000, transactions)).toEqual({
      earnedPoints: 1_000,
      spentPoints: 420,
      availablePoints: 580,
    });
  });

  it("normalizes earned points to a non-negative integer", () => {
    expect(calculateEstatePointAccount(12.9, [])).toEqual({
      earnedPoints: 12,
      spentPoints: 0,
      availablePoints: 12,
    });

    expect(calculateEstatePointAccount(-1, [])).toEqual({
      earnedPoints: 0,
      spentPoints: 0,
      availablePoints: 0,
    });
  });
});
