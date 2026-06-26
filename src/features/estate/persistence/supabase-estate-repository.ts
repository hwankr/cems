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
    data: { snapshot: unknown; version: number } | null;
    error: { message: string } | null;
  }>;
  save(args: {
    subjectId: string;
    snapshot: EstateSnapshot;
    expectedVersion: number | null;
  }): Promise<{
    data: { version: number } | null;
    error: { message: string; conflict?: boolean } | null;
  }>;
  remove(subjectId: string): Promise<{ error: { message: string } | null }>;
}

export type SupabaseEstateRepositoryOptions = {
  client: EstateTableClient;
  seedSnapshot?: (subjectId: string) => EstateSnapshot;
};

export class SupabaseEstateRepository implements EstateRepository {
  private readonly client: EstateTableClient;
  private readonly seedSnapshot: (subjectId: string) => EstateSnapshot;
  // Tracks the last server version seen per subject for optimistic concurrency.
  private readonly versions = new Map<string, number>();

  constructor(options: SupabaseEstateRepositoryOptions) {
    this.client = options.client;
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
      this.versions.delete(subjectId);
      return { ok: true, snapshot: null, recovered: false };
    }

    this.versions.set(subjectId, data.version);

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

    const { data, error } = await this.client.save({
      subjectId,
      snapshot: toPersistableEstateSnapshot(migrated.snapshot),
      expectedVersion: this.versions.get(subjectId) ?? null,
    });

    if (error) {
      return {
        ok: false,
        error: {
          code: error.conflict ? "conflict" : "write-failed",
          subjectId,
          message: error.message,
        },
      };
    }

    if (data) {
      this.versions.set(subjectId, data.version);
    }

    return { ok: true };
  }

  async remove(subjectId: string): Promise<EstateRepositoryWriteResult> {
    const { error } = await this.client.remove(subjectId);
    if (error) {
      return {
        ok: false,
        error: { code: "write-failed", subjectId, message: error.message },
      };
    }
    this.versions.delete(subjectId);
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
