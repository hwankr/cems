// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/client", () => ({
  useI18n: () => ({
    locale: "ko",
    messages: {
      scan: {
        checkpointLabel: "체크포인트 {current}/{total}",
        checkpointReward: "완주 보상 {points}",
        checkpointConfirm: "체크포인트 인증",
        checkpointConfirming: "처리 중",
        checkpointStepDone: "체크포인트 {current}/{total} 완료",
        checkpointCompleted: "경로 완료! {points} 적립",
        checkpointAlready: "오늘 이미 완주했습니다.",
        checkpointAlreadyStep: "이미 인증한 체크포인트입니다.",
        checkpointOutOfOrder: "순서가 맞지 않습니다. 이전 체크포인트부터 인증하세요.",
        checkpointInvalid: "사용할 수 없는 체크포인트입니다.",
      },
      me: {
        missions: {},
      },
    },
  }),
}));

let mockActionState: [{ status: string }, () => void, boolean] = [
  { status: "idle" },
  () => {},
  false,
];

vi.mock("react", async (orig) => {
  const actual = await orig<typeof import("react")>();
  return {
    ...actual,
    useActionState: () => mockActionState,
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

import { CheckpointConfirm } from "../components/checkpoint-confirm";

const checkpoint = {
  code: "main-gate-1",
  routeTitle: "정문 에너지 루트",
  stepTitle: "정문 체크포인트 1",
  location: "정문 진입로",
  stepOrder: 1,
  totalSteps: 3,
  rewardPoints: 100,
};

describe("CheckpointConfirm", () => {
  afterEach(() => {
    document.body.replaceChildren();
    mockActionState = [{ status: "idle" }, () => {}, false];
  });

  it("renders checkpoint route, step, progress, reward, and hidden code", async () => {
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () => root.render(<CheckpointConfirm checkpoint={checkpoint} />));

    expect(container.textContent).toContain("정문 에너지 루트");
    expect(container.textContent).toContain("정문 체크포인트 1");
    expect(container.textContent).toContain("체크포인트 1/3");
    expect(container.textContent).toContain("완주 보상 100점");
    const input = container.querySelector<HTMLInputElement>('input[name="code"]');
    expect(input?.value).toBe("main-gate-1");

    await act(async () => root.unmount());
  });

  it("shows out-of-order feedback when the server rejects the step order", async () => {
    mockActionState = [{ status: "out-of-order" }, () => {}, false];
    const container = document.createElement("div");
    const root: Root = createRoot(container);
    document.body.append(container);
    await act(async () => root.render(<CheckpointConfirm checkpoint={checkpoint} />));

    expect(container.textContent).toContain(
      "순서가 맞지 않습니다. 이전 체크포인트부터 인증하세요.",
    );

    await act(async () => root.unmount());
  });
});
