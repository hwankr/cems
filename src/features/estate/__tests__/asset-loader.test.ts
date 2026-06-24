import { describe, expect, it, vi } from "vitest";
import type { EstateAssetManifest } from "../data/estate-asset-manifest";
import { EstateAssetLoader } from "../isometric/asset-loader";

class FakeImage {
  decode = vi.fn(() => Promise.resolve());
  onerror: OnErrorEventHandler = null;
  onload: ((this: GlobalEventHandlers, event: Event) => void) | null = null;
  private source = "";

  get src() {
    return this.source;
  }

  set src(value: string) {
    this.source = value;
  }

  succeed() {
    this.onload?.call(this as unknown as GlobalEventHandlers, new Event("load"));
  }

  fail() {
    if (typeof this.onerror === "function") {
      this.onerror.call(
        this as unknown as GlobalEventHandlers,
        new Event("error"),
        this.source,
        0,
        0,
        new Error("load failed"),
      );
    }
  }
}

const manifest = {
  ground: {
    grass: {
      id: "grass",
      src: "/estate-assets/tiles/grass.svg",
      fill: "#7fb466",
      stroke: "#5b8c4b",
    },
  },
  items: {
    first: sprite("first", "/estate-assets/shared.svg"),
    second: sprite("second", "/estate-assets/shared.svg"),
  },
} satisfies EstateAssetManifest;

describe("EstateAssetLoader", () => {
  it("preloads unique image sources once and uses decode when available", async () => {
    const created: FakeImage[] = [];
    const loader = new EstateAssetLoader({
      createImage: () => {
        const image = new FakeImage();
        created.push(image);
        return image as unknown as HTMLImageElement;
      },
    });

    const preload = loader.preload(manifest);

    expect(created.map((image) => image.src)).toEqual([
      "/estate-assets/tiles/grass.svg",
      "/estate-assets/shared.svg",
    ]);
    expect(loader.getSnapshot(manifest).status).toBe("loading");

    created.forEach((image) => image.succeed());
    const snapshot = await preload;

    expect(created.every((image) => image.decode.mock.calls.length === 1)).toBe(
      true,
    );
    expect(snapshot.status).toBe("ready");
    expect(snapshot.items.first.image).toBe(snapshot.items.second.image);
    expect(snapshot.failedCount).toBe(0);

    loader.dispose();
    expect(created.every((image) => image.onload === null)).toBe(true);
    expect(created.every((image) => image.onerror === null)).toBe(true);
  });

  it("keeps failed assets addressable so the renderer can use procedural fallback", async () => {
    const created: FakeImage[] = [];
    const loader = new EstateAssetLoader({
      createImage: () => {
        const image = new FakeImage();
        created.push(image);
        return image as unknown as HTMLImageElement;
      },
    });

    const preload = loader.preload(manifest);

    created[0].succeed();
    created[1].fail();
    const snapshot = await preload;

    expect(snapshot.status).toBe("error");
    expect(snapshot.items.first.status).toBe("error");
    expect(snapshot.items.first.image).toBeNull();
    expect(snapshot.ground.grass.status).toBe("ready");
    expect(snapshot.failedCount).toBe(1);
  });

  it("treats load success as drawable even when decode rejects", async () => {
    const created: FakeImage[] = [];
    const loader = new EstateAssetLoader({
      createImage: () => {
        const image = new FakeImage();
        image.decode.mockRejectedValueOnce(new Error("decode unavailable"));
        created.push(image);
        return image as unknown as HTMLImageElement;
      },
    });

    const preload = loader.preload({
      ground: {},
      items: {
        first: sprite("first", "/estate-assets/vector.svg"),
      },
    });

    created[0].succeed();
    const snapshot = await preload;

    expect(snapshot.status).toBe("ready");
    expect(snapshot.items.first.status).toBe("ready");
    expect(snapshot.items.first.image).not.toBeNull();
  });
});

function sprite(id: string, src: string) {
  return {
    id,
    src,
    logicalWidth: 128,
    logicalHeight: 128,
    anchorX: 64,
    anchorY: 118,
    fallback: {
      kind: "decor",
      height: 32,
      fill: "#d7bf76",
      accent: "#8f7440",
      shadow: "#1f2937",
    },
  } as const;
}
