import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { enMessages } from "@/i18n/messages/en";
import { koMessages } from "@/i18n/messages/ko";

const projectRoot = process.cwd();

describe("estate release quality gates", () => {
  it("keeps Canvas code lazy-loaded from the estate client", () => {
    const source = readProjectFile(
      "src/features/estate/components/estate-game-client.tsx",
    );

    expect(source).toMatch(
      /dynamic(?:<[^>]+>)?\(\s*\(\) => import\("\.\/estate-canvas"\)/,
    );
    expect(source).not.toContain(
      "import { EstateCanvas } from \"./estate-canvas\"",
    );
  });

  it("keeps the estate game route free of Mapbox imports", () => {
    const files = [
      "src/app/[locale]/subjects/[subjectId]/estate/page.tsx",
      "src/features/estate/components/estate-game-client.tsx",
      "src/features/estate/components/estate-canvas.tsx",
    ];

    for (const file of files) {
      expect(readProjectFile(file)).not.toMatch(/mapbox-gl|CampusMap/);
    }
  });

  it("keeps estate UI copy in locale dictionaries", () => {
    const source = readProjectFile(
      "src/features/estate/components/estate-game-client.tsx",
    );

    expect(source).not.toMatch(/language === "ko"\s*\?/);
    expect(source).not.toMatch(/formatPointsForUi/);
    expect(getLeafPaths(enMessages.estate).sort()).toEqual(
      getLeafPaths(koMessages.estate).sort(),
    );
    const enEstate = enMessages.estate as unknown as {
      panels?: { shop?: string };
    };
    const koEstate = koMessages.estate as unknown as {
      panels?: { shop?: string };
    };

    expect(enEstate.panels?.shop).toBe("Shop");
    expect(koEstate.panels?.shop).toBe("상점");
  });

  it("keeps the estate world full-screen with click-through overlay chrome on clean tokens", () => {
    const pageSource = readProjectFile(
      "src/app/[locale]/subjects/[subjectId]/estate/page.tsx",
    );
    const clientSource = readProjectFile(
      "src/features/estate/components/estate-game-client.tsx",
    );
    const styleSource = readProjectFile(
      "src/features/estate/components/estate-shell.module.css",
    );

    // The page renders the client directly; the brittle shell wrapper is gone.
    expect(pageSource).toContain("EstateGameClient");
    expect(pageSource).not.toContain("styles.shell");

    // The world is a full-bleed hero with floating, click-through overlay chrome.
    expect(clientSource).toContain("styles.estate");
    expect(clientSource).toContain("absolute inset-0");
    expect(clientSource).toContain("pointer-events-none");

    // Estate identity lives in flat design tokens, not nested !important overrides.
    expect(styleSource).toContain("position: fixed");
    expect(styleSource).toContain("--es-accent");
    expect(styleSource).not.toContain("section:last-of-type");
  });
});

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

function getLeafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    getLeafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}
