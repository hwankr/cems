import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";
import {
  demoGroups,
  demoParticipant,
  demoSchool,
  demoSubjects,
} from "./demo-campus";

export function localizeDemoCampus(locale: Locale, messages: Messages) {
  return {
    groups: demoGroups.map((group) => ({
      ...group,
      name: getGroupName(group.id, messages) ?? group.name,
    })),
    participant: {
      ...demoParticipant,
      displayName: messages.demo.participant.displayName,
    },
    school: {
      ...demoSchool,
      name: messages.demo.school.name,
      shortName: messages.demo.school.shortName,
    },
    subjects: demoSubjects.map((subject) => {
      const localized = getSubjectMessage(subject.id, messages);

      return {
        ...subject,
        name:
          localized?.name ??
          getCatalogFallbackSubjectName(subject, locale),
        shortName: localized?.shortName ?? subject.shortName,
      };
    }),
  };
}

function getCatalogFallbackSubjectName(
  subject: (typeof demoSubjects)[number],
  locale: Locale,
) {
  if (locale === "ko") {
    return subject.nameKo ?? subject.name;
  }

  return subject.nameEn ?? subject.name;
}

function getGroupName(id: string, messages: Messages) {
  return Object.entries(messages.demo.groups).find(
    ([groupId]) => groupId === id,
  )?.[1];
}

function getSubjectMessage(id: string, messages: Messages) {
  return Object.entries(messages.demo.subjects).find(
    ([subjectId]) => subjectId === id,
  )?.[1];
}
