import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * Detail / form of a record, opened on the right side of the list (the list stays visible, slightly
 * blurred, behind it). It is always open while mounted: the route decides when it exists, and
 * `onClose` navigates back to the list (ask first when there are unsaved changes).
 *
 * Closing: render with `open={!leaving}` from useSheetExit so the panel slides out before the route changes.
 * Children fill the sheet below the header. A form should be laid out as
 *   <form className="flex min-h-0 flex-1 flex-col">
 *     <div className="flex-1 overflow-y-auto px-6 py-5 …">fields</div>
 *     <FormFooter inSheet … />
 *   </form>
 * so only the fields scroll and Save / Cancel stay in view.
 */
export function DetailSheet({ title, description, badge, open = true, onClose, children }) {
  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="gap-1 border-b px-6 py-4 pr-16">
          <div className="flex flex-wrap items-center gap-3">
            <SheetTitle className="text-xl font-bold break-words">{title}</SheetTitle>
            {badge}
          </div>
          <SheetDescription className="sr-only">{description ?? title}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
