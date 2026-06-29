import { describe, expect, it } from "vitest";
import { createDemoEstateSeedSnapshot } from "../data/demo-estate-data";
import { estateItemCatalog } from "../data/estate-item-catalog";
import {
  ECO_ACCRUAL_CAP_HOURS,
  collectEcoCredits,
  getAvailableEcoCredits,
  getEstateEcoRatePerHour,
  getPendingEcoCredits,
  mainBuildingEcoRatePerHour,
  spendEcoCredits,
} from "../domain/eco-credit";
import type { EstateSnapshot } from "../domain/types";

const HOUR = 3_600_000;

function seedAt(collectedAtMs: number): EstateSnapshot {
  return {
    ...createDemoEstateSeedSnapshot("yu-e21"),
    ecoCredits: 0,
    ecoCollectedAt: new Date(collectedAtMs).toISOString(),
  };
}

describe("estate eco-credit domain", () => {
  it("scales the main-building base rate with level", () => {
    expect(mainBuildingEcoRatePerHour(1)).toBe(6);
    expect(mainBuildingEcoRatePerHour(5)).toBe(30);
  });

  it("sums the base rate with placed generator rates", () => {
    const snapshot: EstateSnapshot = {
      ...seedAt(0),
      items: [
        ...seedAt(0).items,
        {
          id: "g1",
          definitionId: "solar-array",
          x: 0,
          y: 0,
          rotation: 0,
          placedAt: "2026-06-24T00:00:00.000Z",
        },
      ],
    };
    // base (Lv1) 6 + solar-array 15 = 21
    expect(getEstateEcoRatePerHour(snapshot, estateItemCatalog)).toBe(21);
  });

  it("accrues pending credits over elapsed time, floored and capped", () => {
    const start = 0;
    const snapshot = seedAt(start);
    // Lv1 rate 6/h. After 2h => 12.
    expect(
      getPendingEcoCredits(
        snapshot,
        estateItemCatalog,
        new Date(start + 2 * HOUR).toISOString(),
      ),
    ).toBe(12);
    // Capped at ECO_ACCRUAL_CAP_HOURS.
    const capped = getPendingEcoCredits(
      snapshot,
      estateItemCatalog,
      new Date(start + 1000 * HOUR).toISOString(),
    );
    expect(capped).toBe(6 * ECO_ACCRUAL_CAP_HOURS);
  });

  it("collect banks pending and resets the clock", () => {
    const start = 0;
    const nowIso = new Date(start + 3 * HOUR).toISOString();
    const collected = collectEcoCredits(seedAt(start), estateItemCatalog, nowIso);
    expect(collected.ecoCredits).toBe(18); // 6/h * 3h
    expect(collected.ecoCollectedAt).toBe(nowIso);
    expect(getAvailableEcoCredits(collected, estateItemCatalog, nowIso)).toBe(18);
  });

  it("spend banks pending then subtracts, failing when unaffordable", () => {
    const start = 0;
    const nowIso = new Date(start + 3 * HOUR).toISOString();
    const ok = spendEcoCredits(seedAt(start), estateItemCatalog, 10, nowIso);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.snapshot.ecoCredits).toBe(8); // 18 banked - 10
      expect(ok.snapshot.ecoCollectedAt).toBe(nowIso);
    }
    const broke = spendEcoCredits(seedAt(start), estateItemCatalog, 999, nowIso);
    expect(broke.ok).toBe(false);
  });
});
