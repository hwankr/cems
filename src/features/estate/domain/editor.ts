import type { QuarterTurn } from "./types";

export type EstateEditorMode =
  | { type: "view" }
  | { type: "placing"; definitionId: string; rotation: QuarterTurn }
  | { type: "selected"; instanceId: string }
  | { type: "moving"; instanceId: string; rotation: QuarterTurn }
  | { type: "painting-ground"; definitionId: string }
  | { type: "expanding"; parcelId?: string };

export type EstateSaveStatus = "saved" | "saving" | "failed";

export function getSelectedEstateInstanceId(
  mode: EstateEditorMode,
): string | null {
  if (mode.type === "selected" || mode.type === "moving") {
    return mode.instanceId;
  }

  return null;
}

export function resetEstateEditorModeForSubject(
  previousSubjectId: string,
  nextSubjectId: string,
  mode: EstateEditorMode,
): EstateEditorMode {
  if (previousSubjectId === nextSubjectId) return mode;

  return { type: "view" };
}

export function isEstateShortcutEditableTarget(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable ||
    target.getAttribute("contenteditable") === "true"
  );
}

export function createEstatePurchaseLock() {
  const lockedDefinitionIds = new Set<string>();

  return {
    isLocked(definitionId: string): boolean {
      return lockedDefinitionIds.has(definitionId);
    },
    tryAcquire(definitionId: string): boolean {
      if (lockedDefinitionIds.has(definitionId)) return false;

      lockedDefinitionIds.add(definitionId);
      return true;
    },
    release(definitionId: string): void {
      lockedDefinitionIds.delete(definitionId);
    },
  };
}
