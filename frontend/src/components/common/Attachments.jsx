import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { NativeSelect, Section } from "@/components/common/FormFields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLoad } from "@/hooks/useLoad";
import { attachmentsApi } from "@/services/attachments.service";
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
  const [deleting, setDeleting] = useState(null); // the file asked about

  const say = (code) => t(`master:errors.${code}`, { defaultValue: t("master:errors.UNKNOWN_ERROR") });

  const upload = async () => {
    const chosen = input.current?.files?.[0];
    setError(null);
    if (!chosen) return setError(say("REQUIRED"));
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

      {loading && !data ? (
        <p role="status">{t("common:loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">{t("master:attachments.none")}</p>
      ) : (
        <Table data-stack>
          <TableHeader>
            <TableRow>
              <TableHead>{t("master:attachments.kind")}</TableHead>
              <TableHead>{t("master:attachments.file")}</TableHead>
              <TableHead>{t("master:attachments.size")}</TableHead>
              <TableHead>{t("master:attachments.by")}</TableHead>
              <TableHead>{t("master:attachments.at")}</TableHead>
              <TableHead>
                <span className="sr-only">{t("master:attachments.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell data-label={t("master:attachments.kind")}>{t(`master:attachments.kinds.${row.kind}`)}</TableCell>
                <TableCell data-label={t("master:attachments.file")} className="whitespace-normal">
                  {row.fileName}
                </TableCell>
                <TableCell data-label={t("master:attachments.size")}>{sizeText(row.size)}</TableCell>
                <TableCell data-label={t("master:attachments.by")}>{row.uploadedByName}</TableCell>
                <TableCell data-label={t("master:attachments.at")}>{formatDateTime(row.at, i18n.language)}</TableCell>
                <TableCell>
                  <span className="flex gap-2">
                    <Button type="button" variant="ghost" size="icon" aria-label={`${t("master:attachments.download")}: ${row.fileName}`} title={t("master:attachments.download")} onClick={() => download(row.id).catch(() => setError(say("UNKNOWN_ERROR")))}>
                      <Download aria-hidden="true" />
                    </Button>
                    {canChange && !lockedKinds.includes(row.kind) ? (
                      <Button type="button" variant="ghost" size="icon" aria-label={`${t("master:attachments.delete")}: ${row.fileName}`} title={t("master:attachments.delete")} onClick={() => setDeleting(row)}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    ) : null}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canChange ? (
        <div className="mt-5 grid items-end gap-4 border-t border-border pt-4 sm:grid-cols-[12rem_1fr_auto]">
          <Field>
            <FieldLabel className="text-sm font-semibold">{t("master:attachments.kind")}</FieldLabel>
            <NativeSelect
              aria-label={t("master:attachments.kind")}
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              options={kinds.map((value) => ({ value, label: t(`master:attachments.kinds.${value}`) }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={fileId} className="text-sm font-semibold">
              {t("master:attachments.chooseFile")}
            </FieldLabel>
            <input id={fileId} ref={input} type="file" accept="application/pdf,image/png,image/jpeg" className="text-base" />
          </Field>
          <Button type="button" disabled={busy} onClick={upload}>
            <Upload aria-hidden="true" />
            {busy ? t("master:attachments.uploading") : t("master:attachments.upload")}
          </Button>
        </div>
      ) : null}

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
