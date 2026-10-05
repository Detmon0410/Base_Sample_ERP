import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Drag handle on the edge of a panel (the detail sheet, the sidebar): a thin grey line along the edge that
 * gets darker on hover, while dragging and on keyboard focus. Place it inside a positioned parent, and
 * LAST in it, so the panel never puts the first keyboard focus on the handle.
 *
 *   edge             "left" | "right": which edge of the parent it sits on
 *   value, min, max  current / smallest / largest size in px
 *   valueFromPointer (clientX) => size the pointer asks for
 *   growKey          arrow key that makes the panel bigger ("ArrowLeft" for a panel on the right of the screen)
 *   onChange(size)   every change (live while dragging);  onCommit(size) once when the change is finished
 *   defaultValue     size restored by double-click and Home
 *   onDragChange     optional: called with true / false when a drag starts / ends
 */
export function ResizeHandle({
  edge,
  label,
  value,
  min,
  max,
  defaultValue,
  valueFromPointer,
  growKey,
  step = 32,
  onChange,
  onCommit,
  onDragChange,
  className,
}) {
  const [dragging, setDragging] = useState(false);
  const clamp = (size) => Math.min(Math.max(size, min), max);
  const shrinkKey = growKey === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";

  const setDrag = (next) => {
    setDragging(next);
    onDragChange?.(next);
  };

  const onPointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag(true);
  };
  const onPointerMove = (event) => {
    if (dragging) onChange(clamp(valueFromPointer(event.clientX)));
  };
  const onPointerUp = (event) => {
    if (!dragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDrag(false);
    onCommit?.(clamp(valueFromPointer(event.clientX))); // the size where the pointer was let go
  };
  const apply = (size) => {
    const next = clamp(size);
    onChange(next);
    onCommit?.(next);
  };
  const onKeyDown = (event) => {
    if (event.key === growKey) apply(value + step);
    else if (event.key === shrinkKey) apply(value - step);
    else if (event.key === "Home") apply(defaultValue);
    else return;
    event.preventDefault();
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => apply(defaultValue)}
      onKeyDown={onKeyDown}
      className={cn(
        "group absolute inset-y-0 z-20 hidden w-3 cursor-col-resize touch-none outline-none sm:block",
        edge === "left" ? "left-0" : "right-0",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 w-0.5 transition-colors",
          edge === "left" ? "left-0" : "right-0",
          dragging ? "bg-slate-600" : "bg-slate-300 group-hover:bg-slate-500 group-focus-visible:bg-slate-500",
        )}
      />
    </div>
  );
}
