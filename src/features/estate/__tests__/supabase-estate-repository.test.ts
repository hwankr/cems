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
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
}

describe("SupabaseEstateRepository", () => {
  it("returns a null snapshot (not recovered) when the row is absent", async () => {
    const repo = new SupabaseEstateRepository({
      client: fakeClient(),
      ownerGroupId: "engineering",
    });

    const result = await repo.load(subjectId);
    expect(result).toEqual({ ok: true, snapshot: null, recovered: false });
  });

  it("returns the stored snapshot when present and valid", async () => {
    const seed = createDemoEstateSeedSnapshot(subjectId);
    const repo = new SupabaseEstateRepository({
      client: fakeClient({
        select: vi
          .fn()
          .mockResolvedValue({ data: { snapshot: seed }, error: null }),
      }),
      ownerGroupId: "engineering",
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
          data: { snapshot: { schemaVersion: 99 } },
          error: null,
        }),
      }),
      ownerGroupId: "engineering",
    });

    const result = await repo.load(subjectId);
    expect(result.ok).toBe(true);
    if (result.ok && "recovered" in result) {
      expect(result.recovered).toBe(true);
    }
  });

  it("upserts the owner group id and snapshot on save", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const repo = new SupabaseEstateRepository({
      client: fakeClient({ upsert }),
      ownerGroupId: "engineering",
    });
    const seed = createDemoEstateSeedSnapshot(subjectId);

    const result = await repo.save(subjectId, seed);
    expect(result).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        subject_id: subjectId,
        owner_group_id: "engineering",
      }),
    );
  });

  it("reports a write error when upsert fails", async () => {
    const repo = new SupabaseEstateRepository({
      client: fakeClient({
        upsert: vi.fn().mockResolvedValue({ error: { message: "denied" } }),
      }),
      ownerGroupId: "engineering",
    });

    const result = await repo.save(
      subjectId,
      createDemoEstateSeedSnapshot(subjectId),
    );
    expect(result.ok).toBe(false);
  });
});
