import { describe, expect, it } from "vitest";
import { enMessages } from "../messages/en";
import { koMessages } from "../messages/ko";

describe("messages", () => {
  it("keeps Korean as the source/default language", () => {
    expect(koMessages.app.eyebrow).toBe("캠퍼스 에너지 관리 시스템");
    expect(koMessages.modes.admin).toBe("관리자 대시보드");
  });

  it("provides matching English message groups", () => {
    expect(Object.keys(enMessages)).toEqual(Object.keys(koMessages));
    expect(Object.keys(enMessages.admin.metrics)).toEqual(
      Object.keys(koMessages.admin.metrics),
    );
    expect(enMessages.app.eyebrow).toBe("Campus Energy Management System");
  });
});
