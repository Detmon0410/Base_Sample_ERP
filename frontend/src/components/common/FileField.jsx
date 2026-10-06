import { ExternalLinkIcon, FileIcon, PaperclipIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/utils/format";

const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];
const MAX_BYTES = 10 * 1024 * 1024;

const BOX = "flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2";

/** The file line. With a url the whole box is a link that opens the file in a new tab. */
function FileBox({ url, label, children }) {
  if (!url) return <div className={BOX}>{children}</div>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className={`${BOX} cursor-pointer outline-none hover:border-primary/40 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring`}
    >
      {children}
    </a>
  );
}

/**
 * Choose, show, replace and remove one attachment (PDF, PNG or JPG, up to 10 MB).
 *   value     { name, size, url? } or null    onChange({ name, size, url } | null)
 * `url` opens the file in a new tab (Open) and shows a preview of an image. In the mock it is a link to the file
 * in this browser; the real API sends the file to the server (multipart upload) and answers with its own url,
 * see docs/api/sale.md.
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
    onChange({ name: file.name, size: file.size, url: URL.createObjectURL(file) });
  };

  const isImage = value?.url && /\.(png|jpe?g)$/i.test(value.name);
  const kb = (bytes) => `${formatNumber(Math.max(1, Math.round(bytes / 1024)), i18n.language)} KB`;

  return (
    <div className="flex flex-col gap-3">
      <input ref={input} id={id} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="sr-only" onChange={choose} disabled={disabled} tabIndex={-1} aria-hidden="true" />
      {value ? (
        <FileBox url={value.url} label={t("customerPos.openFile")}>
          <FileIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 font-semibold break-all">{value.name}</span>
          <span className="text-sm text-muted-foreground">{kb(value.size)}</span>
          {value.url ? <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
        </FileBox>
      ) : (
        <p className="text-muted-foreground">{t("customerPos.noFile")}</p>
      )}
      {isImage ? (
        <a href={value.url} target="_blank" rel="noopener noreferrer" className="w-fit rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src={value.url} alt={value.name} className="max-h-56 max-w-full rounded-lg object-contain" />
        </a>
      ) : null}
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
