import { Download } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import { NativeSelect } from "@/components/common/FormFields";
import { Button } from "@/components/ui/button";

/** The papers a PDF can be made on (landscape). */
const PAPERS = ["a4", "a3"];

/**
 * The paper size (A4 or A3) and the Download PDF button of a page that saves itself as a PDF (the ER diagram, the DB relations).
 * `busy` while the PDF is being made; the words of the button come from the page (`label`, `busyLabel`).
 */
export function PdfDownload({ paper, onPaperChange, busy, onDownload, label, busyLabel }) {
  const { t } = useTranslation("common");
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor={id} className="text-sm font-semibold">
        {t("common:pdf.paper")}
      </label>
      <NativeSelect id={id} className="w-24" value={paper} onChange={(event) => onPaperChange(event.target.value)} options={PAPERS.map((value) => ({ value, label: value.toUpperCase() }))} />
      <Button type="button" disabled={busy} onClick={onDownload}>
        <Download aria-hidden="true" />
        {busy ? busyLabel : label}
      </Button>
    </div>
  );
}
