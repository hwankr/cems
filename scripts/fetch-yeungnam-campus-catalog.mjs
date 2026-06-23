import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";

export const KOREAN_CAMPUS_MAP_URL =
  "https://www.yu.ac.kr/main/intro/campus-map.do";
export const ENGLISH_CAMPUS_MAP_URL =
  "https://www.yu.ac.kr/english/about/campus-map.do";
export const LEGACY_KOREAN_CATALOG_URL = "https://www.yu.ac.kr/campus_vr-k/vr.php";
export const LEGACY_ENGLISH_CATALOG_URL =
  "https://www.yu.ac.kr/campus_vr-e/vr_eng.php";

const OUTPUT_URL = new URL(
  "../src/features/campus-energy/data/yeungnam-building-catalog.json",
  import.meta.url,
);

const SCHOOL_ID = "yeungnam";
const OFFICIAL_CAMPUS_MAP_CAPTURED_AT = "2026-06-22T00:00:00.000Z";
const USER_AGENT =
  "cems-data-pipeline/0.1 (Yeungnam official campus map; local development)";

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

const OFFICIAL_FLOOR_SOURCE_BFLOOR = "official-bFloor";
const OFFICIAL_FLOOR_SOURCE_FLIST = "official-fList";

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
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

function extractCampusListJson(html) {
  const startMatch = html.match(/\bvar\s+campusList\s*=/);

  if (!startMatch?.index && startMatch?.index !== 0) {
    throw new Error("Official Yeungnam campus map did not contain campusList.");
  }

  const arrayStart = html.indexOf("[", startMatch.index + startMatch[0].length);

  if (arrayStart < 0) {
    throw new Error("Official Yeungnam campus map campusList was not an array.");
  }

  const arrayEnd = findJavaScriptArrayEnd(html, arrayStart);

  if (arrayEnd < 0) {
    throw new Error("Official Yeungnam campus map campusList array was not closed.");
  }

  return parseCampusListArrayLiteral(html.slice(arrayStart, arrayEnd + 1));
}

function parseCampusListArrayLiteral(arrayLiteral) {
  try {
    return JSON.parse(arrayLiteral);
  } catch {
    const value = runInNewContext(`(${arrayLiteral})`, Object.create(null), {
      timeout: 1000,
    });

    if (!Array.isArray(value)) {
      throw new Error("Official Yeungnam campus map campusList did not evaluate to an array.");
    }

    return value;
  }
}

function findJavaScriptArrayEnd(value, arrayStart) {
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = arrayStart; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }

    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function parseGps(value, context) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing bGPS for official Yeungnam campus-map entry: ${context}`);
  }

  const [lngText, latText] = value.split(",");
  const lng = Number(lngText);
  const lat = Number(latText);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new Error(`Invalid bGPS for official Yeungnam campus-map entry: ${context}`);
  }

  return [lng, lat];
}

function parseNonNegativeInteger(value) {
  const number = Number(value);

  return Number.isInteger(number) && number >= 0 ? number : undefined;
}

export function parseOfficialFloorText(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return {};
  }

  const officialFloorText = value.trim();
  const aboveGroundMatch = officialFloorText.match(/지상\s*:\s*(\d+)\s*층/i);
  const basementMatch = officialFloorText.match(/지하\s*:\s*(\d+)\s*층/i);
  const aboveGroundFloors = aboveGroundMatch
    ? parseNonNegativeInteger(aboveGroundMatch[1])
    : undefined;
  const basementFloors = basementMatch
    ? parseNonNegativeInteger(basementMatch[1])
    : undefined;

  return {
    officialFloorText,
    ...(aboveGroundFloors !== undefined ? { aboveGroundFloors } : {}),
    ...(basementFloors !== undefined ? { basementFloors } : {}),
    ...(aboveGroundFloors !== undefined
      ? { floorCountSource: OFFICIAL_FLOOR_SOURCE_BFLOOR }
      : {}),
  };
}

function getOfficialFloorListLabel(value) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value.fName ?? value.floorName ?? value.name ?? value.label;
}

export function parseOfficialFloorList(value) {
  if (!Array.isArray(value)) {
    return {};
  }

  let aboveGroundFloors;
  let basementFloors;

  for (const floor of value) {
    const label = getOfficialFloorListLabel(floor);

    if (typeof label !== "string") {
      continue;
    }

    const normalized = label.trim().toUpperCase();
    const aboveGroundMatch =
      normalized.match(/^(\d+)\s*F$/) ?? normalized.match(/^F\s*(\d+)$/);
    const basementMatch =
      normalized.match(/^B\s*(\d+)$/) ?? normalized.match(/^(\d+)\s*B$/);

    if (aboveGroundMatch) {
      const floorNumber = parseNonNegativeInteger(aboveGroundMatch[1]);

      if (floorNumber && (aboveGroundFloors === undefined || floorNumber > aboveGroundFloors)) {
        aboveGroundFloors = floorNumber;
      }
    }

    if (basementMatch) {
      const floorNumber = parseNonNegativeInteger(basementMatch[1]);

      if (floorNumber && (basementFloors === undefined || floorNumber > basementFloors)) {
        basementFloors = floorNumber;
      }
    }
  }

  if (aboveGroundFloors === undefined && basementFloors === undefined) {
    return {};
  }

  return {
    ...(aboveGroundFloors !== undefined ? { aboveGroundFloors } : {}),
    ...(basementFloors !== undefined ? { basementFloors } : {}),
    ...(aboveGroundFloors !== undefined
      ? { floorCountSource: OFFICIAL_FLOOR_SOURCE_FLIST }
      : {}),
  };
}

function getOfficialFloorMetadata(building) {
  const fromFloorText = parseOfficialFloorText(building.bFloor);

  if (fromFloorText.aboveGroundFloors !== undefined) {
    return fromFloorText;
  }

  const fromFloorList = parseOfficialFloorList(building.fList);

  return {
    ...fromFloorText,
    ...fromFloorList,
  };
}

function campusIdFromName(campusName, officialCode) {
  const normalized = String(campusName ?? "").toLowerCase();

  return officialCode?.startsWith("H") ||
    normalized.includes("대명") ||
    normalized.includes("대구") ||
    normalized.includes("daegu") ||
    normalized.includes("daemyeong")
    ? "daemyeong"
    : "gyeongsan";
}

function areaFromName(areaName, officialCode) {
  const codeArea = officialCode?.match(/^[A-Z]/)?.[0];
  const nameArea = String(areaName ?? "").match(/[A-H]/)?.[0];

  return codeArea ?? nameArea ?? "ETC";
}

function stableIdForOfficialEntry(entry) {
  if (entry.officialCode) {
    return `yu-${entry.officialCode.toLowerCase()}`;
  }

  return `yu-official-${entry.officialMapUuid.slice(0, 8).toLowerCase()}`;
}

function classifyOfficialEntry(entry) {
  const code = entry.officialCode;
  const haystack = [
    entry.nameKo,
    entry.nameEn,
    entry.sourceUse,
    entry.areaName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (code && LANDMARK_CODES.has(code)) {
    return "landmark";
  }

  if (
    /\b(?:gate|square|clock|park|pond|folklore)\b|정문|동문|서문|남문|북문|지문|게이트|광장|시계|공원|연못|못/.test(
      haystack,
    )
  ) {
    return "landmark";
  }

  if (
    /tennis|baseball|soccer|basketball|field|gymnasium|테니스|야구|축구|농구|운동장|체육|경기장/.test(
      haystack,
    )
  ) {
    return "outdoor";
  }

  if (/water|filtration|상수도|여과지/.test(haystack)) {
    return "utility";
  }

  return "building";
}

export function parseOfficialCampusMapHtml(html, locale) {
  return extractCampusListJson(html).flatMap((campus) =>
    (campus.dList ?? []).flatMap((district) =>
      (district.bList ?? []).map((building) => {
        const officialCode =
          typeof building.bNo === "string" && building.bNo.trim()
            ? building.bNo.trim().toUpperCase()
            : undefined;
        const nameKo = typeof building.bName === "string" ? building.bName.trim() : "";
        const nameEn =
          typeof building.bEngName === "string" && building.bEngName.trim()
            ? building.bEngName.trim()
            : undefined;
        const officialMapUuid =
          typeof building["@UUID@"] === "string" && building["@UUID@"].trim()
            ? building["@UUID@"].trim()
            : `${officialCode ?? nameKo}-${building.bGPS}`;
        const floorMetadata = getOfficialFloorMetadata(building);

        return {
          ...(officialCode ? { officialCode } : {}),
          officialMapUuid,
          campusId: campusIdFromName(campus.cName, officialCode),
          campusName: campus.cName,
          area: areaFromName(district.dName, officialCode),
          areaName: district.dName,
          nameKo,
          ...(nameEn ? { nameEn } : {}),
          gps: parseGps(building.bGPS, officialCode ?? nameKo),
          ...floorMetadata,
          sourceUse: building.bUse ?? "",
          locale,
        };
      }),
    ),
  );
}

function entryKey(entry) {
  if (entry.officialCode) {
    return `code:${entry.officialCode}`;
  }

  return `uuid:${entry.officialMapUuid}`;
}

function gpsKey(entry) {
  return `${entry.gps[0]},${entry.gps[1]}`;
}

function findEnglishEntry(koEntry, englishByKey, englishByGps) {
  return englishByKey.get(entryKey(koEntry)) ?? englishByGps.get(gpsKey(koEntry));
}

export function buildOfficialCampusCatalog({ koEntries, enEntries, capturedAt }) {
  const englishByKey = new Map(enEntries.map((entry) => [entryKey(entry), entry]));
  const englishByGps = new Map(enEntries.map((entry) => [gpsKey(entry), entry]));

  const buildings = koEntries
    .map((koEntry) => {
      const enEntry = findEnglishEntry(koEntry, englishByKey, englishByGps);
      const nameEn = enEntry?.nameEn;
      const id = stableIdForOfficialEntry(koEntry);
      const entry = {
        id,
        schoolId: SCHOOL_ID,
        campusId: koEntry.campusId,
        area: koEntry.area,
        officialMapUuid: koEntry.officialMapUuid,
        name: nameEn ?? koEntry.nameKo,
        nameKo: koEntry.nameKo,
        shortName: koEntry.officialCode ?? koEntry.nameKo,
        kind: classifyOfficialEntry({ ...koEntry, nameEn }),
        sourceUrl: KOREAN_CAMPUS_MAP_URL,
        sourceUrls: [KOREAN_CAMPUS_MAP_URL, ENGLISH_CAMPUS_MAP_URL],
        ...(koEntry.officialFloorText
          ? { officialFloorText: koEntry.officialFloorText }
          : {}),
        ...(koEntry.aboveGroundFloors !== undefined
          ? { aboveGroundFloors: koEntry.aboveGroundFloors }
          : {}),
        ...(koEntry.basementFloors !== undefined
          ? { basementFloors: koEntry.basementFloors }
          : {}),
        ...(koEntry.floorCountSource
          ? { floorCountSource: koEntry.floorCountSource }
          : {}),
        officialPoint: {
          type: "Point",
          coordinates: koEntry.gps,
          geometrySource: {
            kind: "official-campus-map",
            name: "Yeungnam University campus map",
            url: KOREAN_CAMPUS_MAP_URL,
            capturedAt,
          },
          geometryConfidence: "verified",
        },
      };

      if (koEntry.officialCode) {
        entry.officialCode = koEntry.officialCode;
      }

      if (nameEn) {
        entry.nameEn = nameEn;
      }

      return entry;
    })
    .sort(
      (left, right) =>
        left.area.localeCompare(right.area, "en", { numeric: true }) ||
        left.shortName.localeCompare(right.shortName, "ko", { numeric: true }),
    );

  return {
    metadata: {
      schoolId: SCHOOL_ID,
      generatedAt: capturedAt,
      sourceUrls: [KOREAN_CAMPUS_MAP_URL, ENGLISH_CAMPUS_MAP_URL],
      koreanEntryCount: koEntries.length,
      englishEntryCount: enEntries.length,
      officialGpsEntryCount: buildings.filter((building) => building.officialPoint).length,
    },
    buildings,
  };
}

export async function generateCatalog() {
  const capturedAt = OFFICIAL_CAMPUS_MAP_CAPTURED_AT;
  const [koHtml, enHtml] = await Promise.all([
    fetchText(KOREAN_CAMPUS_MAP_URL),
    fetchText(ENGLISH_CAMPUS_MAP_URL),
  ]);
  const koEntries = parseOfficialCampusMapHtml(koHtml, "ko");
  const enEntries = parseOfficialCampusMapHtml(enHtml, "en");
  const catalog = buildOfficialCampusCatalog({ koEntries, enEntries, capturedAt });

  if (catalog.buildings.length < 120) {
    throw new Error(
      `Expected at least 120 official Yeungnam campus-map entries, found ${catalog.buildings.length}`,
    );
  }

  const missingGps = catalog.buildings.filter((building) => !building.officialPoint);

  if (missingGps.length > 0) {
    throw new Error(
      `Expected every official Yeungnam campus-map entry to have GPS, missing ${missingGps.length}`,
    );
  }

  return catalog;
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
