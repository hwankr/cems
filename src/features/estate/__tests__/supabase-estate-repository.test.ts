import { describe, expect, it, vi } from "vitest";
import { createDemoEstateSeedSnapshot } from "../data/demo-estate-data";
import {
  SupabaseEstateRepository,
  type EstateTableClient,
} from "../persistence/supabase-estate-repository";

const subjectId = "yu-e21";

function fakeClient(
  overrides: Partial<EstateTableClient> = {},
): EstateTableClient {
  return {
    select: vi.fn().mockResolvedValue({ data: null, error: null }),
    save: vi.fn().mockResolvedValue({ data: { version: 1 }, error: null }),
    remove: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
}

describe("SupabaseEstateRepository", () => {
  it("returns a null snapshot (not recovered) when the row is absent", async () => {
    const repo = new SupabaseEstateRepository({ client: fakeClient() });

    const result = await repo.load(subjectId);
    expect(result).toEqual({ ok: true, snapshot: null, recovered: false });
  });

  it("returns the stored snapshot when present and valid", async () => {
    const seed = createDemoEstateSeedSnapshot(subjectId);
    const repo = new SupabaseEstateRepository({
      client: fakeClient({
        select: vi
          .fn()
          .mockResolvedValue({ data: { snapshot: seed, version: 3 }, error: null }),
      }),
    });

    const result = await repo.load(subjectId);
    expect(result.ok).toBe(true);
    if (result.ok && result.snapshot) {
      expect(result.snapshot.subjectId).toBe(subjectId);
    } else {
      throw new Error("expected a snapshot");
    }
  });

  it("recovers with a seed snapshot when stored data is corrupt", async () => {
    const repo = new SupabaseEstateRepository({
      client: fakeClient({
        select: vi.fn().mockResolvedValue({
          data: { snapshot: { schemaVersion: 99 }, version: 1 },
          error: null,
        }),
      }),
    });

    const result = await repo.load(subjectId);
    expect(result.ok).toBe(true);
    if (result.ok && "recovered" in result) {
      expect(result.recovered).toBe(true);
    }
  });

  it("saves via the RPC and sends the last-seen version for OCC", async () => {
    const save = vi.fn().mockResolvedValue({ data: { version: 4 }, error: null });
    const repo = new SupabaseEstateRepository({
      client: fakeClient({
        select: vi.fn().mockResolvedValue({
          data: { snapshot: createDemoEstateSeedSnapshot(subjectId), version: 3 },
          error: null,
        }),
        save,
      }),
    });

    await repo.load(subjectId); // captures version 3
    const result = await repo.save(subjectId, createDemoEstateSeedSnapshot(subjectId));

    expect(result).toEqual({ ok: true });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ subjectId, expectedVersion: 3 }),
    );
  });

  it("reports a write error when the save RPC fails", async () => {
    const repo = new SupabaseEstateRepository({
      client: fakeClient({
        save: vi.fn().mockResolvedValue({ data: null, error: { message: "denied" } }),
      }),
    });

    const result = await repo.save(subjectId, createDemoEstateSeedSnapshot(subjectId));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("write-failed");
  });

  it("surfaces a conflict error code when the version is stale", async () => {
    const repo = new SupabaseEstateRepository({
      client: fakeClient({
        save: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "conflict: estate was modified", conflict: true },
        }),
      }),
    });

    const result = await repo.save(subjectId, createDemoEstateSeedSnapshot(subjectId));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("conflict");
  });
});
