import { createDemoEstateSeedSnapshot } from "../data/demo-estate-data";
import type { EstateSnapshot } from "../domain/types";
import {
  getEstateStorageKey,
  migrateEstateSnapshot,
  toPersistableEstateSnapshot,
  type EstateRepository,
  type EstateRepositoryError,
  type EstateRepositoryLoadResult,
  type EstateRepositoryWriteResult,
} from "./estate-repository";

export type EstateStorageLike = Pick<
  Storage,
  "getItem" | "removeItem" | "setItem"
>;

export type LocalStorageEstateRepositoryOptions = {
  storage?: EstateStorageLike | (() => EstateStorageLike | null | undefined);
  seedSnapshot?: (subjectId: string) => EstateSnapshot;
};

export class LocalStorageEstateRepository implements EstateRepository {
  private readonly storage?: LocalStorageEstateRepositoryOptions["storage"];
  private readonly seedSnapshot: (subjectId: string) => EstateSnapshot;

  constructor(options: LocalStorageEstateRepositoryOptions = {}) {
    this.storage = options.storage;
    this.seedSnapshot = options.seedSnapshot ?? createDemoEstateSeedSnapshot;
  }

  async load(subjectId: string): Promise<EstateRepositoryLoadResult> {
    const storage = this.resolveStorage(subjectId);
    if (!storage.ok) return storage;

    const stored = storage.value.getItem(getEstateStorageKey(subjectId));
    if (stored === null) {
      return { ok: true, snapshot: null, recovered: false };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      return this.recover(subjectId, {
        code: "invalid-json",
        subjectId,
        message: "Stored estate snapshot is not valid JSON.",
      });
    }

    const migrated = migrateEstateSnapshot(parsed, { subjectId });
    if (!migrated.ok) {
      return this.recover(subjectId, migrated.error);
    }

    return {
      ok: true,
      snapshot: migrated.snapshot,
      recovered: false,
    };
  }

  async save(
    subjectId: string,
    snapshot: EstateSnapshot,
  ): Promise<EstateRepositoryWriteResult> {
    const storage = this.resolveStorage(subjectId);
    if (!storage.ok) return storage;

    const migrated = migrateEstateSnapshot(snapshot, { subjectId });
    if (!migrated.ok) return { ok: false, error: migrated.error };

    try {
      storage.value.setItem(
        getEstateStorageKey(subjectId),
        JSON.stringify(toPersistableEstateSnapshot(migrated.snapshot)),
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: {
          code: "write-failed",
          subjectId,
          message: "Estate snapshot could not be written to localStorage.",
        },
      };
    }
  }

  async remove(subjectId: string): Promise<EstateRepositoryWriteResult> {
    const storage = this.resolveStorage(subjectId);
    if (!storage.ok) return storage;

    try {
      storage.value.removeItem(getEstateStorageKey(subjectId));
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: {
          code: "write-failed",
          subjectId,
          message: "Estate snapshot could not be removed from localStorage.",
        },
      };
    }
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

  private resolveStorage(
    subjectId: string,
  ):
    | { ok: true; value: EstateStorageLike }
    | { ok: false; error: EstateRepositoryError } {
    try {
      if (typeof this.storage === "function") {
        const storage = this.storage();
        if (storage) return { ok: true, value: storage };
      } else if (this.storage) {
        return { ok: true, value: this.storage };
      } else if (typeof window !== "undefined" && window.localStorage) {
        return { ok: true, value: window.localStorage };
      }
    } catch {
      return storageUnavailable(subjectId);
    }

    return storageUnavailable(subjectId);
  }
}

function storageUnavailable(
  subjectId: string,
): { ok: false; error: EstateRepositoryError } {
  return {
    ok: false,
    error: {
      code: "storage-unavailable",
      subjectId,
      message: "localStorage is not available in this environment.",
    },
  };
}
