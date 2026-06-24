// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuildingPopup } from "../components/building-popup";
import type { BuildingDetail } from "../domain/building-detail";
import type { EnergySubject } from "../domain/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

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

const detail: BuildingDetail = {
  hourly: Array.from({ length: 24 }, () => 10),
  maxHourly: 10,
  floors: 5,
  footprintAreaM2: 1200,
  grossFloorAreaM2: 6000,
  completionYear: 2006,
};

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
});
