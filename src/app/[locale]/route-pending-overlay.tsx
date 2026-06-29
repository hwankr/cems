"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export const ROUTE_PENDING_OVERLAY_DELAY_MS = 120;
const ROUTE_PENDING_OVERLAY_MAX_MS = 12000;

function isPlainLeftClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

function findAnchor(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLAnchorElement>("a[href]");
}

function shouldShowForAnchor(anchor: HTMLAnchorElement) {
  if (anchor.hasAttribute("download")) return false;
  if (anchor.dataset.routePending === "false") return false;
  if (anchor.target && anchor.target !== "_self") return false;

  const destination = new URL(anchor.href, window.location.href);
  const current = new URL(window.location.href);

  if (destination.origin !== current.origin) return false;
  if (
    destination.pathname === current.pathname &&
    destination.search === current.search
  ) {
    return false;
  }

  return true;
}

export function RoutePendingOverlay() {
  const pathname = usePathname();
  const [pendingPathname, setPendingPathname] = useState<string | null>(null);
  const delayTimerRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function clearTimers() {
      if (delayTimerRef.current !== null) {
        window.clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      if (maxTimerRef.current !== null) {
        window.clearTimeout(maxTimerRef.current);
        maxTimerRef.current = null;
      }
    }

    function scheduleOverlay(event: MouseEvent) {
      if (!isPlainLeftClick(event)) return;
      const anchor = findAnchor(event.target);
      if (!anchor || !shouldShowForAnchor(anchor)) return;

      clearTimers();
      delayTimerRef.current = window.setTimeout(() => {
        setPendingPathname(pathname);
        maxTimerRef.current = window.setTimeout(() => {
          setPendingPathname(null);
          maxTimerRef.current = null;
        }, ROUTE_PENDING_OVERLAY_MAX_MS);
      }, ROUTE_PENDING_OVERLAY_DELAY_MS);
    }

    document.addEventListener("click", scheduleOverlay, true);
    function hideOnPageShow() {
      clearTimers();
      setPendingPathname(null);
    }

    window.addEventListener("pageshow", hideOnPageShow);

    return () => {
      document.removeEventListener("click", scheduleOverlay, true);
      window.removeEventListener("pageshow", hideOnPageShow);
      clearTimers();
    };
  }, [pathname]);

  useEffect(() => {
    if (delayTimerRef.current !== null) {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, [pathname]);

  if (pendingPathname !== pathname) return null;

  return (
    <div
      data-route-pending-overlay="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-black/55 px-6 text-white backdrop-blur-[2px]"
    >
      <div
        role="status"
        aria-live="polite"
        className="grid w-full max-w-[15rem] justify-items-center gap-3 rounded-2xl border border-white/15 bg-black/45 px-5 py-4 text-center shadow-pop"
      >
        <span
          aria-hidden="true"
          className="h-9 w-9 animate-spin rounded-full border-2 border-white/70 border-r-transparent"
        />
        <div>
          <p className="text-sm font-semibold">처리 중</p>
          <p className="mt-1 text-xs text-white/75">잠시만 기다려 주세요.</p>
        </div>
      </div>
    </div>
  );
}
