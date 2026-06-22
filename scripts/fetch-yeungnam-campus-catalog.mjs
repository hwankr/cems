#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const KOREAN_CATALOG_URL = "https://www.yu.ac.kr/campus_vr-k/vr.php";
export const ENGLISH_CATALOG_URL =
  "https://www.yu.ac.kr/campus_vr-e/vr_eng.php";

const OUTPUT_URL = new URL(
  "../src/features/campus-energy/data/yeungnam-building-catalog.json",
  import.meta.url,
);

const SCHOOL_ID = "yeungnam";
const CAMPUS_ID = "gyeongsan";
const USER_AGENT =
  "cems-data-pipeline/0.1 (Yeungnam building catalog; local development)";

const LANDMARK_CODES = new Set([
  "A01",
  "G41",
  "G42",
  "G43",
  "G44",
  "G45",
  "G46",
  "G47",
  "G48",
  "G49",
]);
const OUTDOOR_CODES = new Set(["A09", "A14", "B01", "C31"]);
const UTILITY_CODES = new Set(["G65"]);

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, body) => {
    const lower = body.toLowerCase();

    if (lower.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    }

    if (lower.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    }

    return named[lower] ?? entity;
  });
}

function stripTags(value) {
  return decodeHtmlEntities(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveUrl(href, sourceUrl) {
  if (!href) {
    return undefined;
  }

  return new URL(decodeHtmlEntities(href), sourceUrl).href;
}

function parseArea(block) {
  const dtMatch = block.match(/<dt\b[^>]*>([\s\S]*?)<\/dt>/i);
  const dtText = dtMatch ? stripTags(dtMatch[1]) : "";
  const areaMatch = dtText.match(/[A-H]/i);
  return areaMatch ? areaMatch[0].toUpperCase() : undefined;
}

export function parseCampusCatalogHtml(html, sourceUrl) {
  const entries = [];
  const dlPattern = /<dl\b[^>]*>([\s\S]*?)<\/dl>/gi;

  for (const dlMatch of html.matchAll(dlPattern)) {
    const block = dlMatch[1];
    const blockArea = parseArea(block);
    const ddPattern = /<dd\b[^>]*>([\s\S]*?)<\/dd>/gi;

    for (const ddMatch of block.matchAll(ddPattern)) {
      const ddHtml = ddMatch[1];
      const entryMatch = ddHtml.match(
        /<span\b[^>]*>\s*([A-Z]\d{2})\s*<\/span>\s*([\s\S]*)/i,
      );

      if (!entryMatch) {
        continue;
      }

      const hrefMatch = ddHtml.match(/\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
      const code = entryMatch[1].toUpperCase();
      const name = stripTags(entryMatch[2]);

      if (!name) {
        continue;
      }

      entries.push({
        code,
        area: blockArea ?? code[0],
        name,
        detailUrl: resolveUrl(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3], sourceUrl),
      });
    }
  }

  return entries;
}

export function classifyCatalogKind(entry) {
  const code = entry.officialCode ?? entry.code;

  if (LANDMARK_CODES.has(code)) {
    return "landmark";
  }

  if (OUTDOOR_CODES.has(code)) {
    return "outdoor";
  }

  if (UTILITY_CODES.has(code)) {
    return "utility";
  }

  const haystack = `${entry.nameKo ?? ""} ${entry.nameEn ?? ""}`.toLowerCase();

  if (
    haystack.includes("tennis court") ||
    haystack.includes("amphitheater") ||
    haystack.includes("baseball field")
  ) {
    return "outdoor";
  }

  if (
    haystack.includes("gate") ||
    haystack.includes("metro square") ||
    haystack.includes("folklore")
  ) {
    return "landmark";
  }

  if (haystack.includes("filtration") || haystack.includes("water work")) {
    return "utility";
  }

  return "building";
}

export function buildCatalog(koEntries, enEntries) {
  const englishByCode = new Map(enEntries.map((entry) => [entry.code, entry]));
  const sortedKoreanEntries = [...koEntries].sort((left, right) =>
    left.code.localeCompare(right.code, "en", { numeric: true }),
  );

  return sortedKoreanEntries.map((koEntry) => {
    const enEntry = englishByCode.get(koEntry.code);
    const nameEn = enEntry?.name;
    const sourceUrls = [
      KOREAN_CATALOG_URL,
      ENGLISH_CATALOG_URL,
      koEntry.detailUrl,
      enEntry?.detailUrl,
    ].filter(Boolean);
    const uniqueSourceUrls = [...new Set(sourceUrls)];
    const entry = {
      id: `yu-${koEntry.code.toLowerCase()}`,
      schoolId: SCHOOL_ID,
      campusId: CAMPUS_ID,
      area: koEntry.area,
      officialCode: koEntry.code,
      name: nameEn ?? koEntry.name,
      nameKo: koEntry.name,
      shortName: koEntry.code,
      kind: "building",
      sourceUrl: koEntry.detailUrl ?? KOREAN_CATALOG_URL,
      sourceUrls: uniqueSourceUrls,
    };

    if (nameEn) {
      entry.nameEn = nameEn;
    }

    entry.kind = classifyCatalogKind(entry);

    return entry;
  });
}

function extractCharset(contentType) {
  return contentType?.match(/\bcharset=([^;]+)/i)?.[1]?.trim();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const charset = extractCharset(response.headers.get("content-type")) ?? "utf-8";

  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

export async function generateCatalog() {
  const [koHtml, enHtml] = await Promise.all([
    fetchText(KOREAN_CATALOG_URL),
    fetchText(ENGLISH_CATALOG_URL),
  ]);
  const koEntries = parseCampusCatalogHtml(koHtml, KOREAN_CATALOG_URL);
  const enEntries = parseCampusCatalogHtml(enHtml, ENGLISH_CATALOG_URL);
  const buildings = buildCatalog(koEntries, enEntries);

  if (buildings.length < 90) {
    throw new Error(
      `Expected at least 90 Yeungnam catalog entries, found ${buildings.length}`,
    );
  }

  return {
    metadata: {
      schoolId: SCHOOL_ID,
      campusId: CAMPUS_ID,
      generatedAt: new Date().toISOString(),
      sourceUrls: [KOREAN_CATALOG_URL, ENGLISH_CATALOG_URL],
      koreanEntryCount: koEntries.length,
      englishEntryCount: enEntries.length,
    },
    buildings,
  };
}

async function main() {
  const catalog = await generateCatalog();
  await mkdir(dirname(fileURLToPath(OUTPUT_URL)), { recursive: true });
  await writeFile(OUTPUT_URL, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(
    `Wrote ${catalog.buildings.length} catalog entries to ${fileURLToPath(OUTPUT_URL)}`,
  );
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
