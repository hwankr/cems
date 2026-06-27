// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuildingPopup } from "../components/building-popup";
import type { BuildingDetail } from "../domain/building-detail";
import type { EnergyComparison, EnergySubject } from "../domain/types";
import type { SubjectContributor } from "@/features/account/domain/contributor-ranking";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      mapView: {
        popup: {
          realtimeUsage: "실시간 사용량",
          vsForecast: "예측 대비",
          hourlyTitle: "시간대별 사용량",
          nowReference: "{time} 기준",
          hourTick: "{hour}시",
          scale: "규모",
          floorsValue: "{floors}층",
          area: "연면적",
          completion: "준공",
          close: "닫기",
          noData: "데이터 없음",
          openEstate: "영지 이동",
        },
        contributors: {
          tabEnergy: "에너지 진단",
          tabRanking: "기여 랭킹",
          title: "개인 기여 랭킹",
          subtitle: "누적 포인트 · 미리보기",
          pointsUnit: "P",
          you: "나",
          empty: "아직 등록된 기여자가 없어요",
          emptyHint: "이 건물을 운영하는 그룹의 기여자가 표시됩니다",
        },
      },
      status: {
        neutral: "보통",
        overuse: "초과",
        saving: "절감",
      },
    },
  }),
}));

const subject: EnergySubject = {
  id: "yu-e21",
  schoolId: "yeungnam",
  campusId: "gyeongsan",
  type: "building",
  name: "IT관",
  shortName: "E21",
  officialCode: "E21",
};

const comparison: EnergyComparison = {
  subjectId: "yu-e21",
  actualKwh: 650,
  forecastKwh: 812,
  periodLabel: "2026-06",
  deltaKwh: -162,
  savingsKwh: 162,
  overuseKwh: 0,
  savingsRate: 0.2,
  status: "saving",
};

const detail: BuildingDetail = {
  hourly: Array.from({ length: 24 }, () => 10),
  maxHourly: 10,
  floors: 5,
  footprintAreaM2: 1200,
  grossFloorAreaM2: 6000,
  completionYear: 2006,
};

const contributors: SubjectContributor[] = [
  { userId: "u1", displayName: "게스트 1", points: 1850, rank: 1, isMe: false },
  { userId: "me", displayName: "나야나", points: 1320, rank: 2, isMe: true },
];

function findButtonByText(container: HTMLElement, label: string) {
  return [...container.querySelectorAll("button")].find((button) =>
    button.textContent?.includes(label),
  ) as HTMLButtonElement | undefined;
}

describe("BuildingPopup", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("links the selected building popup to that subject's estate route", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(
        <BuildingPopup
          subject={subject}
          detail={detail}
          campusName="영남대학교"
          onClose={vi.fn()}
        />,
      ),
    );

    const estateLink = container.querySelector<HTMLAnchorElement>(
      'a[href="/ko/subjects/yu-e21/estate"]',
    );

    expect(estateLink?.textContent).toContain("영지 이동");

    await act(async () => root.unmount());
  });

  it("shows energy diagnosis by default and switches to the ranking on toggle", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(
        <BuildingPopup
          subject={subject}
          comparison={comparison}
          detail={detail}
          campusName="영남대학교"
          contributors={contributors}
          onClose={vi.fn()}
        />,
      ),
    );

    // Energy tab active by default → realtime usage label is visible.
    expect(container.textContent).toContain("실시간 사용량");
    expect(container.textContent).not.toContain("나야나");

    const rankingTab = findButtonByText(container, "기여 랭킹");
    expect(rankingTab).toBeDefined();
    await act(async () => rankingTab!.click());

    // Ranking tab → contributors visible, energy diagnosis hidden.
    expect(container.textContent).toContain("나야나");
    expect(container.textContent).toContain("1,850");
    expect(container.textContent).toContain("나"); // self chip
    expect(container.textContent).not.toContain("실시간 사용량");

    await act(async () => root.unmount());
  });

  it("shows the empty state in the ranking tab when there are no contributors", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);

    await act(async () =>
      root.render(
        <BuildingPopup
          subject={subject}
          comparison={comparison}
          detail={detail}
          campusName="영남대학교"
          contributors={[]}
          onClose={vi.fn()}
        />,
      ),
    );

    const rankingTab = findButtonByText(container, "기여 랭킹");
    await act(async () => rankingTab!.click());

    expect(container.textContent).toContain("아직 등록된 기여자가 없어요");

    await act(async () => root.unmount());
  });
});
