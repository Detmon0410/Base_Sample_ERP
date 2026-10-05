import { FileIcon, PaperclipIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/utils/format";

const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Choose, show, replace and remove one attachment (PDF, PNG or JPG, up to 10 MB).
 *   value     { name, size } or null          onChange({ name, size } | null)
 * Only the name and the size are kept here; the file itself is sent to the server by the real API
 * (multipart upload, see docs/api/sale.md).
 */
export function FileField({ id, value, onChange, disabled = false }) {
  const { t, i18n } = useTranslation("sale");
  const input = useRef(null);
  const [error, setError] = useState("");

  const choose = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED.includes(file.type)) return setError(t("customerPos.fileType"));
    if (file.size > MAX_BYTES) return setError(t("customerPos.fileTooBig"));
    setError("");
    onChange({ name: file.name, size: file.size });
  };

  const kb = (bytes) => `${formatNumber(Math.max(1, Math.round(bytes / 1024)), i18n.language)} KB`;

  return (
    <div className="flex flex-col gap-3">
      <input ref={input} id={id} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="sr-only" onChange={choose} disabled={disabled} tabIndex={-1} aria-hidden="true" />
      {value ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
          <FileIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 break-all font-semibold">{value.name}</span>
          <span className="text-sm text-muted-foreground">{kb(value.size)}</span>
        </div>
      ) : (
        <p className="text-muted-foreground">{t("customerPos.noFile")}</p>
      )}
      {!disabled ? (
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => input.current?.click()}>
            <PaperclipIcon aria-hidden="true" /> {value ? t("customerPos.replaceFile") : t("customerPos.chooseFile")}
          </Button>
          {value ? (
            <Button type="button" variant="outline" onClick={() => onChange(null)}>
              <XIcon aria-hidden="true" /> {t("customerPos.removeFile")}
            </Button>
          ) : null}
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">{t("customerPos.fileHint")}</p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
