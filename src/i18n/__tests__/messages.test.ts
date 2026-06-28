import { describe, expect, it } from "vitest";
import { enMessages } from "../messages/en";
import { koMessages } from "../messages/ko";

describe("messages", () => {
  it("keeps Korean as the source/default language", () => {
    expect(koMessages.app.eyebrow).toBe("캠퍼스 에너지 관리 시스템");
    expect(koMessages.mapView.settings.title).toBe("설정");
  });

  it("provides matching English message groups", () => {
    expect(Object.keys(enMessages)).toEqual(Object.keys(koMessages));
    expect(Object.keys(enMessages.admin.metrics)).toEqual(
      Object.keys(koMessages.admin.metrics),
    );
    expect(Object.keys(enMessages.mapView.controls)).toEqual(
      Object.keys(koMessages.mapView.controls),
    );
    expect(Object.keys(enMessages.mapView.popup)).toEqual(
      Object.keys(koMessages.mapView.popup),
    );
    expect(Object.keys(enMessages.estate)).toEqual(
      Object.keys(koMessages.estate),
    );
    expect(enMessages.app.eyebrow).toBe("Campus Energy Management System");
    expect(enMessages.mapView.controls.resetView).toBe("Reset view");
  });
});
