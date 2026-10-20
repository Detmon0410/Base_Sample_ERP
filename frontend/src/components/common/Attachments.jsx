import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { NativeSelect, Section } from "@/components/common/FormFields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLoad } from "@/hooks/useLoad";
import { attachmentsApi } from "@/services/attachments.service";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/format";

const FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_BYTES = 10 * 1024 * 1024;

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** "1.2 MB", "340 KB", "12 B". */
function sizeText(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Opens the saved file on the computer of the user: the content comes with one call, so the list stays light. */
async function download(id) {
  const { file } = await attachmentsApi.get(id);
  const link = document.createElement("a");
  link.href = file.dataUrl;
  link.download = file.name;
  link.click();
}

/**
 * The files of one record (a QT, a production order, a purchase order): the list with the kind, the name, the size, who and when, a
 * download and (for the roles that may) a delete, and a small form that adds a file. PDF, PNG or JPG, up to 10 MB.
 *
 *   ownerType, ownerId   whose files these are
 *   kinds                the kinds this owner may have, for example ["EVIDENCE", "OTHER"]
 *   canChange            may the user add and delete files (the server decides too)
 *   lockedKinds          kinds that cannot be deleted here (the PO file of an order is the copy of the PO file of its QT)
 *   title                the heading of the section
 */
export function Attachments({ ownerType, ownerId, kinds, canChange, title, lockedKinds = [] }) {
  const { t, i18n } = useTranslation(["master", "common"]);
  const fileId = useId();
  const input = useRef(null);
  const { data, loading, reload } = useLoad(() => attachmentsApi.list(ownerType, ownerId), [ownerType, ownerId]);
  const [kind, setKind] = useState(kinds[0]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false); // a file is over the drop zone
  const [deleting, setDeleting] = useState(null); // the file asked about

  const say = (code) => t(`master:errors.${code}`, { defaultValue: t("master:errors.UNKNOWN_ERROR") });

  const upload = async (chosen) => {
    setError(null);
    if (!chosen) return;
    if (!FILE_TYPES.includes(chosen.type)) return setError(say("FILE_TYPE"));
    if (chosen.size > MAX_BYTES) return setError(say("FILE_TOO_BIG"));
    setBusy(true);
    try {
      const file = await readFile(chosen);
      await attachmentsApi.create({ ownerType, ownerId, kind, file });
      toast.success(t("master:attachments.uploaded"));
      input.current.value = "";
      reload();
    } catch (failure) {
      setError(say(failure?.details?.[0]?.code ?? failure?.code));
    } finally {
      if (input.current) input.current.value = ""; // the same file can be chosen again
      setBusy(false);
    }
  };

  const remove = async () => {
    const item = deleting;
    setDeleting(null);
    try {
      await attachmentsApi.remove(item.id);
      toast.success(t("master:attachments.deleted"));
      reload();
    } catch (failure) {
      setError(say(failure?.code));
    }
  };

  const rows = data ?? [];

  return (
    <Section icon={Paperclip} title={title ?? t("master:attachments.title")}>
      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="text-base">{error}</AlertDescription>
        </Alert>
      ) : null}

      {canChange ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">{t("master:attachments.kind")}</span>
            <NativeSelect aria-label={t("master:attachments.kind")} className="w-44" value={kind} onChange={(event) => setKind(event.target.value)} options={kinds.map((value) => ({ value, label: t(`master:attachments.kinds.${value}`) }))} />
          </div>
          {/* a drop zone: drop a file on it or click it to browse; the file is uploaded as soon as it is chosen */}
          <input id={fileId} ref={input} type="file" accept="application/pdf,image/png,image/jpeg" aria-label={t("master:attachments.chooseFile")} className="sr-only" onChange={(event) => upload(event.target.files?.[0])} />
          <label
            htmlFor={fileId}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              upload(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors has-[:focus-visible]:ring-2",
              dragging ? "border-primary bg-[#e6f3fa]" : "border-[#c4cbd3] bg-white hover:border-primary hover:bg-[#f1f8fc]",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <span className="grid size-10 place-items-center rounded-md bg-[#eef1f4] text-foreground">
              <Upload aria-hidden="true" className="size-5" />
            </span>
            <span className="text-base font-semibold">{busy ? t("master:attachments.uploading") : t("master:attachments.drop")}</span>
            <span className="text-sm text-muted-foreground">{t("master:attachments.fileHint")}</span>
          </label>
        </div>
      ) : null}

      {/* the files, under the drop zone: one row each (type, name, size, kind, who and when) with Download and Delete */}
      {loading && !data ? (
        <p role="status" className="mt-4">{t("common:loading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{t("master:attachments.none")}</p>
      ) : (
        <ul className="m-0 mt-4 flex list-none flex-col divide-y divide-border border-t border-border p-0">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#eef1f4] text-xs font-bold">{(row.fileName.split(".").pop() ?? "").slice(0, 4).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{row.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {sizeText(row.size)} · {t(`master:attachments.kinds.${row.kind}`)} · {row.uploadedByName} · {formatDateTime(row.at, i18n.language)}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label={`${t("master:attachments.download")}: ${row.fileName}`} title={t("master:attachments.download")} onClick={() => download(row.id).catch(() => setError(say("UNKNOWN_ERROR")))}>
                <Download aria-hidden="true" />
              </Button>
              {canChange && !lockedKinds.includes(row.kind) ? (
                <Button type="button" variant="ghost" size="icon" aria-label={`${t("master:attachments.delete")}: ${row.fileName}`} title={t("master:attachments.delete")} onClick={() => setDeleting(row)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("master:attachments.deleteTitle")}
        text={t("master:attachments.deleteText", { name: deleting?.fileName ?? "" })}
        onConfirm={remove}
      />
    </Section>
  );
}
