"use client";

import type { ReactNode } from "react";
import { Check, Move, PackageCheck, RotateCw, X } from "lucide-react";
import type { EstateEditorMode } from "../domain/editor";
import type { EstateItemDefinition, EstateItemInstance } from "../domain/types";
import type { EstateItemActionAnchor } from "../isometric/action-anchor";
import { getItemName, type EstateMessages } from "./estate-copy";
import styles from "./estate-shell.module.css";

type ContextualItemActionsProps = {
  copy: EstateMessages;
  definition: EstateItemDefinition;
  instance: EstateItemInstance;
  mode: EstateEditorMode;
  protectedItem: boolean;
  anchor: EstateItemActionAnchor | null;
  onCancel: () => void;
  onConfirmMove: () => void;
  onMove: () => void;
  onRotate: () => void;
  onCollect: () => void;
};

type ContextualActionMenuPositionInput = {
  anchor: EstateItemActionAnchor;
  menuWidth: number;
  menuHeight: number;
  topReserved: number;
  bottomReserved: number;
};

type ContextualSelectionCopy = EstateMessages["selection"] & {
  itemActions?: string;
  collect?: string;
  confirm?: string;
  moveTargetSelected?: string;
};

const contextMenuWidth = 272;
const contextMenuHeight = 76;
const topReserved = 72;
const bottomReserved = 92;
const edgePadding = 12;

export function ContextualItemActions({
  copy,
  definition,
  instance,
  mode,
  protectedItem,
  anchor,
  onCancel,
  onConfirmMove,
  onMove,
  onRotate,
  onCollect,
}: ContextualItemActionsProps) {
  if (!anchor) return null;

  const position = getContextualActionMenuPosition({
    anchor,
    menuWidth: contextMenuWidth,
    menuHeight: contextMenuHeight,
    topReserved,
    bottomReserved,
  });
  const moving = mode.type === "moving" && mode.instanceId === instance.id;
  const targetCell = moving ? mode.targetCell : undefined;
  const itemName = getItemName(definition, copy);
  const selectionCopy = copy.selection as ContextualSelectionCopy;
  const confirmLabel = selectionCopy.confirm ?? "Confirm";
  const collectLabel = selectionCopy.collect ?? copy.selection.remove;
  const visibleActionLabels = moving
    ? [
        ...(targetCell ? [confirmLabel] : []),
        copy.selection.rotate,
        copy.selection.cancel,
      ]
    : [
        copy.selection.move,
        copy.selection.rotate,
        collectLabel,
        copy.selection.cancel,
      ];
  const toolbarLabel =
    selectionCopy.itemActions ?? visibleActionLabels.join(", ");

  return (
    <div
      role="toolbar"
      aria-label={toolbarLabel}
      className={`${styles.contextMenu} ${
        moving ? styles.contextMenuMoving : ""
      } rounded-lg p-1.5`}
      style={{ left: position.left, top: position.top }}
    >
      <div className="flex items-center gap-2 px-1">
        <div className="min-w-0 flex-1">
          <p
            className={`${styles.contextMenuTitle} truncate text-[13px] font-semibold`}
          >
            {itemName}
          </p>
          <p className={`${styles.contextMenuMeta} truncate text-[11px]`}>
            {moving ? getMovingMeta(selectionCopy, targetCell) : `${instance.x}, ${instance.y}`}
          </p>
        </div>
        <button
          type="button"
          className={`${styles.contextAction} grid h-8 w-8 shrink-0 place-items-center rounded-lg`}
          aria-label={copy.selection.cancel}
          title={copy.selection.cancel}
          onClick={onCancel}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div
        className={`mt-1 grid gap-1 ${
          moving ? (targetCell ? "grid-cols-2" : "grid-cols-1") : "grid-cols-3"
        }`}
      >
        {!moving ? (
          <ContextActionButton
            disabled={protectedItem}
            icon={<Move size={14} aria-hidden="true" />}
            label={copy.selection.move}
            onClick={onMove}
          />
        ) : null}
        {moving && targetCell ? (
          <ContextActionButton
            disabled={protectedItem}
            icon={<Check size={14} aria-hidden="true" />}
            label={confirmLabel}
            onClick={onConfirmMove}
          />
        ) : null}
        <ContextActionButton
          disabled={protectedItem || !definition.canRotate}
          icon={<RotateCw size={14} aria-hidden="true" />}
          label={copy.selection.rotate}
          onClick={onRotate}
        />
        {!moving ? (
          <ContextActionButton
            disabled={protectedItem}
            icon={<PackageCheck size={14} aria-hidden="true" />}
            label={collectLabel}
            onClick={onCollect}
          />
        ) : null}
      </div>
    </div>
  );
}

function getMovingMeta(
  selectionCopy: ContextualSelectionCopy,
  targetCell: { x: number; y: number } | undefined,
): string {
  if (!targetCell) return selectionCopy.choosingMoveTarget;

  return `${selectionCopy.moveTargetSelected ?? "Move target"}: ${targetCell.x}, ${targetCell.y}`;
}

export function getContextualActionMenuPosition({
  anchor,
  menuWidth,
  menuHeight,
  topReserved,
  bottomReserved,
}: ContextualActionMenuPositionInput): { left: number; top: number } {
  const minLeft = edgePadding;
  const maxLeft = Math.max(
    minLeft,
    anchor.viewportWidth - edgePadding - menuWidth,
  );
  const minTop = Math.max(edgePadding, topReserved);
  const maxTop = Math.max(
    minTop,
    anchor.viewportHeight - bottomReserved - menuHeight,
  );

  return {
    left: clamp(anchor.x - menuWidth / 2, minLeft, maxLeft),
    top: clamp(anchor.y - menuHeight - edgePadding, minTop, maxTop),
  };
}

function ContextActionButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.contextAction} inline-flex h-8 items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] font-semibold`}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
