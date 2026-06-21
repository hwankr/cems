import type { Messages } from "@/i18n/messages/types";
import {
  demoGroups,
  demoParticipant,
  demoSchool,
  demoSubjects,
} from "./demo-campus";

export function localizeDemoCampus(messages: Messages) {
  return {
    groups: demoGroups.map((group) => ({
      ...group,
      name: messages.demo.groups[group.id as keyof typeof messages.demo.groups],
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
      const localized =
        messages.demo.subjects[
          subject.id as keyof typeof messages.demo.subjects
        ];

      return {
        ...subject,
        name: localized.name,
        shortName: localized.shortName,
      };
    }),
  };
}
