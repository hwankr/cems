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

type ContextualAction = {
  key: string;
  label: string;
  icon: ReactNode;
  disabled: boolean;
  onClick: () => void;
};

// Compact icon-cluster geometry, used to keep the anchored menu inside the
// viewport. Each control is a 40px icon button, 4px apart, in a 6px-padded pill.
const actionButtonSize = 40;
const actionGap = 4;
const clusterPadding = 6;
const clusterHeight = actionButtonSize + clusterPadding * 2;
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
  const moving = mode.type === "moving" && mode.instanceId === instance.id;
  const targetCell = moving ? mode.targetCell : undefined;
  const selectionCopy = copy.selection as ContextualSelectionCopy;
  const confirmLabel = selectionCopy.confirm ?? "Confirm";
  const collectLabel = selectionCopy.collect ?? copy.selection.remove;

  const cancelAction: ContextualAction = {
    key: "cancel",
    label: copy.selection.cancel,
    icon: <X size={18} aria-hidden="true" />,
    disabled: false,
    onClick: onCancel,
  };
  const rotateAction: ContextualAction = {
    key: "rotate",
    label: copy.selection.rotate,
    icon: <RotateCw size={18} aria-hidden="true" />,
    disabled: protectedItem || !definition.canRotate,
    onClick: onRotate,
  };

  const actions: ContextualAction[] = moving
    ? [
        ...(targetCell
          ? [
              {
                key: "confirm",
                label: confirmLabel,
                icon: <Check size={18} aria-hidden="true" />,
                disabled: protectedItem,
                onClick: onConfirmMove,
              },
            ]
          : []),
        rotateAction,
        cancelAction,
      ]
    : [
        {
          key: "move",
          label: copy.selection.move,
          icon: <Move size={18} aria-hidden="true" />,
          disabled: protectedItem,
          onClick: onMove,
        },
        rotateAction,
        {
          key: "collect",
          label: collectLabel,
          icon: <PackageCheck size={18} aria-hidden="true" />,
          disabled: protectedItem,
          onClick: onCollect,
        },
        cancelAction,
      ];

  const itemName = getItemName(definition, copy);
  const toolbarLabel =
    selectionCopy.itemActions ??
    actions.map((action) => action.label).join(", ");

  if (!anchor) return null;

  const menuWidth =
    actions.length * actionButtonSize +
    Math.max(0, actions.length - 1) * actionGap +
    clusterPadding * 2;

  const position = getContextualActionMenuPosition({
    anchor,
    menuWidth,
    menuHeight: clusterHeight,
    topReserved,
    bottomReserved,
  });

  // A small, semi-transparent icon cluster anchored just above the item. It is
  // deliberately compact and see-through so it barely covers the world while a
  // move target is being picked; taps outside its icons pass straight to the
  // canvas, and it fades to full opacity on hover/focus.
  return (
    <div
      role="toolbar"
      aria-label={toolbarLabel}
      title={itemName}
      className={`${styles.contextCluster} ${
        moving ? styles.contextClusterMoving : ""
      } flex items-center gap-1 rounded-full p-1.5`}
      style={{ left: position.left, top: position.top }}
    >
      {actions.map((action) => (
        <ContextActionButton
          key={action.key}
          disabled={action.disabled}
          icon={action.icon}
          label={action.label}
          onClick={action.onClick}
        />
      ))}
    </div>
  );
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
      className={`${styles.contextAction} grid h-10 w-10 shrink-0 place-items-center rounded-full`}
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
