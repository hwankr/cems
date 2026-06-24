import type { EstateSnapshot } from "../domain/types";
import {
  migrateEstateSnapshot,
  toPersistableEstateSnapshot,
  type EstateRepository,
  type EstateRepositoryLoadResult,
  type EstateRepositoryWriteResult,
} from "./estate-repository";

export class MemoryEstateRepository implements EstateRepository {
  private readonly snapshots = new Map<string, EstateSnapshot>();

  constructor(initialSnapshots: readonly EstateSnapshot[] = []) {
    for (const snapshot of initialSnapshots) {
      this.snapshots.set(
        snapshot.subjectId,
        toPersistableEstateSnapshot(snapshot),
      );
    }
  }

  async load(subjectId: string): Promise<EstateRepositoryLoadResult> {
    const snapshot = this.snapshots.get(subjectId);

    return {
      ok: true,
      snapshot: snapshot ? toPersistableEstateSnapshot(snapshot) : null,
      recovered: false,
    };
  }

  async save(
    subjectId: string,
    snapshot: EstateSnapshot,
  ): Promise<EstateRepositoryWriteResult> {
    const migrated = migrateEstateSnapshot(snapshot, { subjectId });
    if (!migrated.ok) return { ok: false, error: migrated.error };

    this.snapshots.set(subjectId, toPersistableEstateSnapshot(migrated.snapshot));
    return { ok: true };
  }

  async remove(subjectId: string): Promise<EstateRepositoryWriteResult> {
    this.snapshots.delete(subjectId);
    return { ok: true };
  }
}
