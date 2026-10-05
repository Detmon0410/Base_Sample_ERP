import { FileTextIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

/**
 * Documents connected to this one (Quotation → Sale Order → Work Order → Delivery → Invoice).
 * `items`: [{ id, type, number, to?, status? }] — `status` is a ready-made StatusBadge.
 */
export function LinkedDocuments({ title, items, bare = false }) {
  const { t } = useTranslation();

  const content = (
    <>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("detail.noLinkedDocuments")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const row = (
              <>
                <FileTextIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-muted-foreground">{item.type}</span>
                  <span className="block font-semibold break-words">{item.number}</span>
                </span>
                {item.status}
              </>
            );
            return (
              <li key={item.id}>
                {item.to ? (
                  <Link
                    to={item.to}
                    className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  // bare: only the list, for a parent that draws the card (SheetSection in a detail sheet)
  if (bare) return content;
  return (
    <section className="rounded-xl border bg-card p-6" aria-labelledby="linked-documents-title">
      <h3 id="linked-documents-title" className="mb-4 text-lg font-bold">
        {title ?? t("detail.linkedDocuments")}
      </h3>
      {content}
    </section>
  );
}
