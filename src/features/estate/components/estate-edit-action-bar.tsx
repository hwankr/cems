"use client";

import type { ReactNode } from "react";
import { Check, Move, PackageCheck, RotateCw, X } from "lucide-react";
import type { EstateEditorMode } from "../domain/editor";
import type { EstateMessages } from "./estate-copy";
import styles from "./estate-shell.module.css";

type EstateEditActionBarProps = {
  copy: EstateMessages;
  mode: EstateEditorMode;
  canRotate: boolean;
  canConfirm: boolean;
  onMove: () => void;
  onRotate: () => void;
  onCollect: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

type BarAction = {
  key: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  primary?: boolean;
  onClick: () => void;
};

export function EstateEditActionBar({
  copy,
  mode,
  canRotate,
  canConfirm,
  onMove,
  onRotate,
  onCollect,
  onConfirm,
  onCancel,
}: EstateEditActionBarProps) {
  const selection = copy.selection;
  const rotate: BarAction = {
    key: "rotate",
    label: selection.rotate,
    icon: <RotateCw size={18} aria-hidden="true" />,
    disabled: !canRotate,
    onClick: onRotate,
  };
  const cancel: BarAction = {
    key: "cancel",
    label: selection.cancel,
    icon: <X size={18} aria-hidden="true" />,
    onClick: onCancel,
  };

  const actions: BarAction[] =
    mode.type === "placing"
      ? [rotate, cancel]
      : mode.type === "moving"
        ? [
            {
              key: "confirm",
              label: selection.confirm,
              icon: <Check size={18} aria-hidden="true" />,
              disabled: !canConfirm,
              primary: true,
              onClick: onConfirm,
            },
            rotate,
            cancel,
          ]
        : [
            {
              key: "move",
              label: selection.move,
              icon: <Move size={18} aria-hidden="true" />,
              primary: true,
              onClick: onMove,
            },
            rotate,
            {
              key: "collect",
              label: selection.collect ?? selection.remove,
              icon: <PackageCheck size={18} aria-hidden="true" />,
              onClick: onCollect,
            },
            cancel,
          ];

  return (
    <div
      role="toolbar"
      aria-label={selection.itemActions ?? selection.move}
      className={`${styles.panelStrong} pointer-events-auto fixed inset-x-2 bottom-2 z-40 mx-auto flex max-w-sm items-center justify-around gap-1 rounded-2xl p-1.5 lg:absolute lg:inset-x-auto lg:bottom-3 lg:left-1/2 lg:-translate-x-1/2`}
    >
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          aria-label={action.label}
          title={action.label}
          disabled={action.disabled}
          onClick={action.onClick}
          className={`flex h-12 min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
            action.primary ? styles.tabActive : styles.tab
          }`}
        >
          {action.icon}
          <span className="truncate">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
