import { describe, expect, it } from "vitest";
import { enMessages } from "../../../i18n/messages/en";
import { koMessages } from "../../../i18n/messages/ko";
import type { Messages } from "../../../i18n/messages/types";
import buildingCatalog from "../data/yeungnam-building-catalog.json";
import { demoGroups, demoSubjects } from "../data/demo-campus";
import { localizeDemoCampus } from "../data/localized-demo-campus";

type CatalogBuilding = {
  id: string;
  name: string;
  nameKo?: string;
  nameEn?: string;
  shortName: string;
};

const catalogBuildings = (buildingCatalog as { buildings: CatalogBuilding[] })
  .buildings;

function findCatalogBuilding(id: string) {
  const building = catalogBuildings.find((candidate) => candidate.id === id);

  if (!building) {
    throw new Error(`Missing generated catalog building ${id}`);
  }

  return building;
}

function findLocalizedSubject(
  subjects: ReturnType<typeof localizeDemoCampus>["subjects"],
  id: string,
) {
  const subject = subjects.find((candidate) => candidate.id === id);

  if (!subject) {
    throw new Error(`Missing localized subject ${id}`);
  }

  return subject;
}

function withoutSubjectMessages(messages: Messages): Messages {
  return {
    ...messages,
    demo: {
      ...messages.demo,
      subjects: {},
    },
  } as Messages;
}

describe("localizeDemoCampus", () => {
  it("keeps canonical IDs while applying localized school and group names", () => {
    const localized = localizeDemoCampus("en", enMessages);

    expect(localized.school.name).toBe("Yeungnam University");
    expect(localized.subjects.map((subject) => subject.id)).toEqual(
      demoSubjects.map((subject) => subject.id),
    );
    expect(localized.groups.map((group) => group.id)).toEqual(
      demoGroups.map((group) => group.id),
    );
    expect(
      localized.groups.find((group) => group.id === "engineering")?.name,
    ).toBe(enMessages.demo.groups.engineering);
  });

  it("uses Korean generated catalog names for generated subjects without message entries", () => {
    const catalogSubject = findCatalogBuilding("yu-e21");
    const localizedSubject = findLocalizedSubject(
      localizeDemoCampus("ko", koMessages).subjects,
      catalogSubject.id,
    );

    expect(catalogSubject.nameKo).toBeDefined();
    expect(catalogSubject.nameKo).not.toBe(catalogSubject.name);
    expect(localizedSubject.name).toBe(catalogSubject.nameKo);
    expect(localizedSubject.shortName).toBe(catalogSubject.shortName);
  });

  it("uses English generated catalog names for generated subjects without message entries", () => {
    const catalogSubject = findCatalogBuilding("yu-e21");
    const localizedSubject = findLocalizedSubject(
      localizeDemoCampus("en", enMessages).subjects,
      catalogSubject.id,
    );

    expect(localizedSubject.name).toBe(
      catalogSubject.nameEn ?? catalogSubject.name,
    );
    expect(localizedSubject.shortName).toBe(catalogSubject.shortName);
  });

  it("falls back to exact locale catalog subject names when message entries are missing", () => {
    const catalogSubject = findCatalogBuilding("yu-e21");
    const localizedEnSubjects = localizeDemoCampus(
      "en",
      withoutSubjectMessages(enMessages),
    ).subjects;

    const localizedKo = findLocalizedSubject(
      localizeDemoCampus("ko", withoutSubjectMessages(koMessages)).subjects,
      catalogSubject.id,
    );
    const localizedEn = findLocalizedSubject(
      localizedEnSubjects,
      catalogSubject.id,
    );

    expect(localizedEnSubjects.map((subject) => subject.id)).toEqual(
      demoSubjects.map((subject) => subject.id),
    );
    expect(localizedKo.name).toBe(catalogSubject.nameKo ?? catalogSubject.name);
    expect(localizedKo.shortName).toBe(catalogSubject.shortName);
    expect(localizedEn.name).toBe(catalogSubject.nameEn ?? catalogSubject.name);
    expect(localizedEn.shortName).toBe(catalogSubject.shortName);
  });

  it("uses the explicit locale instead of inferring fallback language from messages", () => {
    const catalogSubject = findCatalogBuilding("yu-e21");

    const localizedKo = findLocalizedSubject(
      localizeDemoCampus("ko", withoutSubjectMessages(enMessages)).subjects,
      catalogSubject.id,
    );
    const localizedEn = findLocalizedSubject(
      localizeDemoCampus("en", withoutSubjectMessages(koMessages)).subjects,
      catalogSubject.id,
    );

    expect(localizedKo.name).toBe(catalogSubject.nameKo ?? catalogSubject.name);
    expect(localizedEn.name).toBe(catalogSubject.nameEn ?? catalogSubject.name);
  });
});
