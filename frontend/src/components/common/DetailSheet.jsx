import { XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const STORAGE_KEY = "kanou.sheetWidth";
const DEFAULT_WIDTH = 672; // px
const MIN_WIDTH = 440;
const KEY_STEP = 32;
const EDGE_GAP = 80; // the list always keeps this much visible on the left

const maxWidth = () => Math.max(MIN_WIDTH, window.innerWidth - EDGE_GAP);
const clamp = (value) => Math.min(Math.max(value, MIN_WIDTH), maxWidth());

function readWidth() {
  try {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    return saved ? clamp(saved) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

function saveWidth(width) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Math.round(width)));
  } catch {
    // private window or blocked storage: the width just is not remembered
  }
}

/**
 * Detail / form of a record, opened on the right side of the list (the list stays visible, slightly
 * blurred, behind it). It is always open while mounted: the route decides when it exists, and
 * `onClose` navigates back to the list (ask first when there are unsaved changes).
 *
 * Width: drag the three dots on the left edge (a light blue band shows on hover) (or use the arrow keys on it) to make the sheet wider or
 * narrower; double-click resets. The width is remembered between visits.
 *
 * Closing: render with `open={!leaving}` from useSheetExit so the panel slides out before the route changes.
 *
 * Layout: white header (title, status badge, `actions`, close button) over a light grey body
 * (#F1F5F9) that holds white cards (SheetSection / FormSection). `actions` are usually <RecordActions>.
 * A form in the body is laid out as
 *   <form id="..." className="flex min-h-0 flex-1 flex-col">
 *     <div className="flex-1 overflow-y-auto p-5 ...">cards</div>
 *   </form>
 * and Save in the header submits it through form="...".
 */
export function DetailSheet({ title, description, badge, actions, open = true, onClose, children }) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(readWidth);
  const [dragging, setDragging] = useState(false);

  // Keep the sheet inside the window when the window gets smaller.
  useEffect(() => {
    const onResize = () => setWidth((current) => clamp(current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const change = useCallback((next, { persist = false } = {}) => {
    const value = clamp(next);
    setWidth(value);
    if (persist) saveWidth(value);
  }, []);

  const onPointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event) => {
    if (dragging) change(window.innerWidth - event.clientX);
  };
  const onPointerUp = (event) => {
    if (!dragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    saveWidth(clamp(window.innerWidth - event.clientX)); // the width where the pointer was let go
  };
  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") change(width + KEY_STEP, { persist: true });
    else if (event.key === "ArrowRight") change(width - KEY_STEP, { persist: true });
    else if (event.key === "Home") change(DEFAULT_WIDTH, { persist: true });
    else return;
    event.preventDefault();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        showCloseButton={false}
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none"
        style={{ width: `min(${width}px, 100vw)` }}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t("detail.resize")}
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={maxWidth()}
          aria-valuenow={Math.round(width)}
          tabIndex={0}
          title={t("detail.resize")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => change(DEFAULT_WIDTH, { persist: true })}
          onKeyDown={onKeyDown}
          className={`group absolute inset-y-0 left-0 z-10 hidden w-3.5 cursor-col-resize touch-none items-center justify-center outline-none transition-colors sm:flex ${dragging ? "bg-sky-200" : "hover:bg-sky-200 focus-visible:bg-sky-200"}`}
        >
          <span aria-hidden="true" className="flex flex-col gap-1">
            <span className="size-1 rounded-full bg-slate-400 group-hover:bg-sky-700 group-focus-visible:bg-sky-700" />
            <span className="size-1 rounded-full bg-slate-400 group-hover:bg-sky-700 group-focus-visible:bg-sky-700" />
            <span className="size-1 rounded-full bg-slate-400 group-hover:bg-sky-700 group-focus-visible:bg-sky-700" />
          </span>
        </div>

        <SheetHeader className="flex-row flex-wrap items-center gap-x-3 gap-y-2 border-b bg-card px-5 py-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <SheetTitle className="text-xl font-bold break-words">{title}</SheetTitle>
            {badge}
          </div>
          <SheetDescription className="sr-only">{description ?? title}</SheetDescription>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <SheetClose asChild>
              <Button type="button" variant="outline" size="icon" aria-label={t("actions.cancel")}>
                <XIcon />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>
        <div className="@container flex min-h-0 flex-1 flex-col bg-[#F1F5F9]">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
