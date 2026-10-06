import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ResizeHandle } from "@/components/common/ResizeHandle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const DEFAULT_STORAGE_KEY = "kanou.sheetWidth";
const DEFAULT_WIDTH = 672; // px
const MIN_WIDTH = 440;
const EDGE_GAP = 80; // the list always keeps this much visible on the left

const maxWidth = () => Math.max(MIN_WIDTH, window.innerWidth - EDGE_GAP);
const clamp = (value) => Math.min(Math.max(value, MIN_WIDTH), maxWidth());

function readWidth(storageKey, fallback) {
  try {
    const saved = Number(window.localStorage.getItem(storageKey));
    return saved ? clamp(saved) : clamp(fallback);
  } catch {
    return clamp(fallback);
  }
}

function saveWidth(storageKey, width) {
  try {
    window.localStorage.setItem(storageKey, String(Math.round(width)));
  } catch {
    // private window or blocked storage: the width just is not remembered
  }
}

/**
 * Detail / form of a record, opened on the right side of the list (the list stays visible, slightly
 * dimmed, behind it). It is always open while mounted: the route decides when it exists, and
 * `onClose` navigates back to the list (ask first when there are unsaved changes).
 *
 * `defaultWidth` / `widthKey`: a kind of sheet can have its own default width and its own remembered width
 * (documents use a wider sheet than master data).
 *
 * Width: drag the thin line on the left edge (it darkens on hover) or use the arrow keys on it;
 * double-click resets. The width is remembered between visits. The handle comes last in the DOM so it is
 * not the first stop of the Tab key.
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
export function DetailSheet({
  title,
  description,
  badge,
  actions,
  open = true,
  onClose,
  defaultWidth = DEFAULT_WIDTH,
  widthKey = DEFAULT_STORAGE_KEY,
  children,
}) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(() => readWidth(widthKey, defaultWidth));

  // The header and the panel slide in first; the heavy content (form, tables, cards) is drawn two frames later,
  // so the first frames of the slide are not spent on rendering it.
  const [bodyReady, setBodyReady] = useState(false);
  useEffect(() => {
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setBodyReady(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  // Tell the toasts how wide the sheet is, so they stay beside it and never cover its header buttons.
  useEffect(() => {
    document.documentElement.style.setProperty("--sheet-offset", `${width}px`);
    return () => document.documentElement.style.removeProperty("--sheet-offset");
  }, [width]);

  // Keep the sheet inside the window when the window gets smaller.
  useEffect(() => {
    const onResize = () => setWidth((current) => clamp(current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        showCloseButton={false}
        // Focus the panel itself, not its first button: a focused header button would open its tooltip and
        // the first Esc would only close that tooltip.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          event.currentTarget.focus();
        }}
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none"
        style={{ width: `min(${width}px, 100vw)` }}
      >
        <SheetHeader className="flex-row flex-nowrap items-center gap-3 border-b bg-card px-5 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-x-3">
            <SheetTitle className="truncate text-lg font-bold">{title}</SheetTitle>
            {badge}
          </div>
          <SheetDescription className="sr-only">{description ?? title}</SheetDescription>
          <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
            {actions}
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={t("actions.cancel")}>
                <XIcon />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>
        <div className="@container flex min-h-0 flex-1 flex-col bg-[#F1F5F9]">{bodyReady ? children : null}</div>

        <ResizeHandle
          edge="left"
          label={t("detail.resize")}
          value={width}
          min={MIN_WIDTH}
          max={maxWidth()}
          defaultValue={defaultWidth}
          growKey="ArrowLeft"
          valueFromPointer={(clientX) => window.innerWidth - clientX}
          onChange={setWidth}
          onCommit={(value) => saveWidth(widthKey, value)}
        />
      </SheetContent>
    </Sheet>
  );
}
