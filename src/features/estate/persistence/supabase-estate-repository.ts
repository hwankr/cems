import { createDemoEstateSeedSnapshot } from "../data/demo-estate-data";
import type { EstateSnapshot } from "../domain/types";
import {
  migrateEstateSnapshot,
  toPersistableEstateSnapshot,
  type EstateRepository,
  type EstateRepositoryError,
  type EstateRepositoryLoadResult,
  type EstateRepositoryWriteResult,
} from "./estate-repository";

export interface EstateTableClient {
  select(subjectId: string): Promise<{
    data: { snapshot: unknown } | null;
    error: { message: string } | null;
  }>;
  upsert(row: {
    subject_id: string;
    owner_group_id: string;
    snapshot: EstateSnapshot;
  }): Promise<{ error: { message: string } | null }>;
  delete(subjectId: string): Promise<{ error: { message: string } | null }>;
}

export type SupabaseEstateRepositoryOptions = {
  client: EstateTableClient;
  ownerGroupId: string;
  seedSnapshot?: (subjectId: string) => EstateSnapshot;
};

export class SupabaseEstateRepository implements EstateRepository {
  private readonly client: EstateTableClient;
  private readonly ownerGroupId: string;
  private readonly seedSnapshot: (subjectId: string) => EstateSnapshot;

  constructor(options: SupabaseEstateRepositoryOptions) {
    this.client = options.client;
    this.ownerGroupId = options.ownerGroupId;
    this.seedSnapshot = options.seedSnapshot ?? createDemoEstateSeedSnapshot;
  }

  async load(subjectId: string): Promise<EstateRepositoryLoadResult> {
    const { data, error } = await this.client.select(subjectId);

    if (error) {
      return this.recover(subjectId, {
        code: "storage-unavailable",
        subjectId,
        message: error.message,
      });
    }

    if (!data) {
      return { ok: true, snapshot: null, recovered: false };
    }

    const migrated = migrateEstateSnapshot(data.snapshot, { subjectId });
    if (!migrated.ok) {
      return this.recover(subjectId, migrated.error);
    }

    return { ok: true, snapshot: migrated.snapshot, recovered: false };
  }

  async save(
    subjectId: string,
    snapshot: EstateSnapshot,
  ): Promise<EstateRepositoryWriteResult> {
    const migrated = migrateEstateSnapshot(snapshot, { subjectId });
    if (!migrated.ok) return { ok: false, error: migrated.error };

    const { error } = await this.client.upsert({
      subject_id: subjectId,
      owner_group_id: this.ownerGroupId,
      snapshot: toPersistableEstateSnapshot(migrated.snapshot),
    });

    if (error) {
      return {
        ok: false,
        error: { code: "write-failed", subjectId, message: error.message },
      };
    }

    return { ok: true };
  }

  async remove(subjectId: string): Promise<EstateRepositoryWriteResult> {
    const { error } = await this.client.delete(subjectId);
    if (error) {
      return {
        ok: false,
        error: { code: "write-failed", subjectId, message: error.message },
      };
    }
    return { ok: true };
  }

  private recover(
    subjectId: string,
    error: EstateRepositoryError,
  ): EstateRepositoryLoadResult {
    return {
      ok: true,
      snapshot: this.seedSnapshot(subjectId),
      recovered: true,
      error,
    };
  }
}
