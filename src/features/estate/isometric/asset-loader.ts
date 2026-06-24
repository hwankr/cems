import type {
  EstateAssetManifest,
  EstateGroundAssetDefinition,
  EstateSpriteAssetDefinition,
} from "../data/estate-asset-manifest";

export type EstateAssetLoadStatus = "idle" | "loading" | "ready" | "error";

export type EstateLoadedSpriteAsset = {
  definition: EstateSpriteAssetDefinition;
  image: HTMLImageElement | null;
  status: EstateAssetLoadStatus;
  error: Error | null;
};

export type EstateLoadedGroundAsset = {
  definition: EstateGroundAssetDefinition;
  image: HTMLImageElement | null;
  status: EstateAssetLoadStatus;
  error: Error | null;
};

export type EstateAssetLoadSnapshot = {
  status: EstateAssetLoadStatus;
  items: Record<string, EstateLoadedSpriteAsset>;
  ground: Record<string, EstateLoadedGroundAsset>;
  pendingCount: number;
  readyCount: number;
  failedCount: number;
};

type EstateImageCacheEntry = {
  src: string;
  image: HTMLImageElement;
  status: EstateAssetLoadStatus;
  error: Error | null;
  promise: Promise<HTMLImageElement | null>;
  cleanup: () => void;
};

type EstateAssetLoaderOptions = {
  createImage?: () => HTMLImageElement;
};

const emptySnapshotCounts = {
  pendingCount: 0,
  readyCount: 0,
  failedCount: 0,
};

export function createEstateAssetLoadSnapshot(
  manifest: EstateAssetManifest,
): EstateAssetLoadSnapshot {
  return {
    status: "idle",
    items: Object.fromEntries(
      Object.entries(manifest.items).map(([id, definition]) => [
        id,
        {
          definition,
          image: null,
          status: "idle" as const,
          error: null,
        },
      ]),
    ),
    ground: Object.fromEntries(
      Object.entries(manifest.ground).map(([id, definition]) => [
        id,
        {
          definition,
          image: null,
          status: "idle" as const,
          error: null,
        },
      ]),
    ),
    ...emptySnapshotCounts,
  };
}

export class EstateAssetLoader {
  private readonly createImage: () => HTMLImageElement;
  private readonly cache = new Map<string, EstateImageCacheEntry>();
  private disposed = false;

  constructor(options: EstateAssetLoaderOptions = {}) {
    this.createImage = options.createImage ?? createBrowserImage;
  }

  preload(manifest: EstateAssetManifest): Promise<EstateAssetLoadSnapshot> {
    this.disposed = false;
    const uniqueSources = getManifestSources(manifest);
    const promises = uniqueSources.map((src) =>
      this.loadSource(src).catch(() => null),
    );

    return Promise.all(promises).then(() => this.getSnapshot(manifest));
  }

  getSnapshot(manifest: EstateAssetManifest): EstateAssetLoadSnapshot {
    const items = Object.fromEntries(
      Object.entries(manifest.items).map(([id, definition]) => [
        id,
        this.getLoadedSpriteAsset(definition),
      ]),
    );
    const ground = Object.fromEntries(
      Object.entries(manifest.ground).map(([id, definition]) => [
        id,
        this.getLoadedGroundAsset(definition),
      ]),
    );
    const statuses = getManifestSources(manifest).map(
      (src) => this.cache.get(src)?.status ?? "idle",
    );
    const pendingCount = statuses.filter((status) => status === "loading").length;
    const failedCount = statuses.filter((status) => status === "error").length;
    const readyCount = statuses.filter((status) => status === "ready").length;
    const status = getAggregateStatus({
      pendingCount,
      failedCount,
      totalCount: statuses.length,
      readyCount,
    });

    return {
      status,
      items,
      ground,
      pendingCount,
      readyCount,
      failedCount,
    };
  }

  dispose() {
    this.disposed = true;

    for (const entry of this.cache.values()) {
      entry.cleanup();
    }
  }

  private getLoadedSpriteAsset(
    definition: EstateSpriteAssetDefinition,
  ): EstateLoadedSpriteAsset {
    const entry = this.cache.get(definition.src);

    return {
      definition,
      image: entry?.status === "ready" ? entry.image : null,
      status: entry?.status ?? "idle",
      error: entry?.error ?? null,
    };
  }

  private getLoadedGroundAsset(
    definition: EstateGroundAssetDefinition,
  ): EstateLoadedGroundAsset {
    const entry = this.cache.get(definition.src);

    return {
      definition,
      image: entry?.status === "ready" ? entry.image : null,
      status: entry?.status ?? "idle",
      error: entry?.error ?? null,
    };
  }

  private loadSource(src: string): Promise<HTMLImageElement | null> {
    const existing = this.cache.get(src);
    if (existing) {
      return existing.promise;
    }

    const image = this.createImage();
    let cleanup = () => undefined;
    const entry: EstateImageCacheEntry = {
      src,
      image,
      status: "loading",
      error: null,
      promise: Promise.resolve(null),
      cleanup: () => cleanup(),
    };
    const promise = new Promise<HTMLImageElement | null>((resolve, reject) => {
      image.onload = async () => {
        if (this.disposed) {
          cleanup();
          resolve(null);
          return;
        }

        try {
          if (typeof image.decode === "function") {
            await image.decode().catch(() => undefined);
          }
          entry.status = "ready";
          entry.error = null;
          cleanup();
          resolve(image);
        } catch (error) {
          const normalizedError = normalizeError(error, src);
          entry.status = "error";
          entry.error = normalizedError;
          cleanup();
          reject(normalizedError);
        }
      };

      image.onerror = (_event, _source, _line, _column, error) => {
        const normalizedError = normalizeError(error, src);
        entry.status = "error";
        entry.error = normalizedError;
        cleanup();
        reject(normalizedError);
      };
    });

    cleanup = () => {
      image.onload = null;
      image.onerror = null;
    };
    entry.promise = promise;
    this.cache.set(src, entry);
    image.src = src;
    return promise;
  }
}

function getManifestSources(manifest: EstateAssetManifest): string[] {
  return [
    ...new Set([
      ...Object.values(manifest.ground).map((definition) => definition.src),
      ...Object.values(manifest.items).map((definition) => definition.src),
    ]),
  ];
}

function getAggregateStatus({
  pendingCount,
  failedCount,
  readyCount,
  totalCount,
}: {
  pendingCount: number;
  failedCount: number;
  readyCount: number;
  totalCount: number;
}): EstateAssetLoadStatus {
  if (pendingCount > 0) return "loading";
  if (failedCount > 0) return "error";
  if (readyCount === totalCount && totalCount > 0) return "ready";
  return "idle";
}

function normalizeError(error: unknown, src: string): Error {
  if (error instanceof Error) return error;
  return new Error(`Failed to load estate asset: ${src}`);
}

function createBrowserImage(): HTMLImageElement {
  if (typeof Image === "undefined") {
    throw new Error("EstateAssetLoader requires a browser Image constructor.");
  }

  return new Image();
}
