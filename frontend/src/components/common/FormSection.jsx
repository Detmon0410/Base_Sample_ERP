import { SheetSection } from "@/components/common/SheetSection";

/**
 * A titled card of fields inside a form (F3 spec 2.2). Short fields sit in two columns on a wide
 * sheet and stack on a narrow one. `icon` is a lucide icon component.
 */
export function FormSection({ title, icon, aside, children, columns = 2 }) {
  return (
    <SheetSection title={title} icon={icon} aside={aside}>
      <div className={columns === 1 ? "grid gap-5" : "grid gap-x-6 gap-y-5 @lg:grid-cols-2"}>{children}</div>
    </SheetSection>
  );
}
