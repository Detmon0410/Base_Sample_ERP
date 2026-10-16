import { ArrowLeft, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLoad } from "@/hooks/useLoad";
import { applyServerErrors } from "@/utils/serverErrors";

/**
 * The page of one record (a new one, or `/:id`): the title band, the fields (`children`), and Save / Cancel
 * at the bottom. Errors are shown only after Save; after Save the list opens.
 * An existing record has a Delete (after a confirmation that names it). A record that is still used is not deleted: the page says
 * where it is used (`409 IN_USE`, docs/api/master-data.md).
 *
 *   api        the calls of the resource (services/crud.js)
 *   listPath   where Cancel and a successful Save go
 *   newTitle   title of a new record;  titleOf(record) the title of an existing one
 *   defaults   the empty form;  toForm(record) -> form values;  toBody(values) -> what is sent
 *   readOnly   no Save (a Worker looking at products or materials, a QT that is confirmed)
 *   afterSave  (saved) => path: where the page goes after Save (default: the list), for a page that has more to do on the record
 *   actions    ({ record, reload }) => the extra buttons of a saved record (for example Confirm); `reload` loads the record again
 *   after      ({ record, reload }) => what follows the form of a saved record, outside the <form> (a part with a form of its own)
 *   children   ({ form, record, readOnly, reload }) => the fields
 */
export function RecordFormPage({ api, listPath, newTitle, titleOf, defaults, toForm, toBody, readOnly = false, afterSave, actions, after, children }) {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { t } = useTranslation(["master", "common"]);
  const [summary, setSummary] = useState(null);
  const [blocked, setBlocked] = useState(null); // where the record is used, when the delete was refused
  const [asking, setAsking] = useState(false);

  const { data: record, error: loadError, loading, reload } = useLoad(() => (isNew ? Promise.resolve(null) : api.get(id)), [id]);
  const form = useForm({ defaultValues: defaults, values: record ? toForm(record) : undefined });

  const show = (error) => setSummary(applyServerErrors(form, error, t));

  const onSubmit = form.handleSubmit(async (values) => {
    setSummary(null);
    try {
      const saved = isNew ? await api.create(toBody(values)) : await api.update(id, toBody(values));
      const next = afterSave ? afterSave(saved) : listPath;
      toast.success(t("master:form.saved"));
      navigate(next);
    } catch (error) {
      show(error);
    }
  });

  const remove = async () => {
    setSummary(null);
    setBlocked(null);
    try {
      await api.remove(id);
      toast.success(t("master:delete.done"));
      navigate(listPath);
    } catch (error) {
      if (error?.code === "IN_USE" && Array.isArray(error.details)) setBlocked(error.details);
      else show(error);
    }
  };

  /** "Production orders: ORD-2026-0001, ORD-2026-0002" for a place where the record is used. */
  const usedText = (place) => t(`master:delete.used.${place.kind}`, { count: place.count, items: place.items.join(", ") + (place.count > place.items.length ? ", ..." : "") });

  if (loadError) {
    return (
      <>
        <PageHeader title={t("master:form.notFound")} />
        <p>
          <Link to={listPath}><ArrowLeft aria-hidden="true" />{t("master:form.back")}</Link>
        </p>
      </>
    );
  }
  if (loading) return <PageHeader title={t("common:loading")} />;

  return (
    <>
      <PageHeader title={isNew ? newTitle : titleOf(record)} />

      <form noValidate onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-5">
        {summary ? (
          <Alert variant="destructive">
            <AlertDescription className="text-base">{summary}</AlertDescription>
          </Alert>
        ) : null}

        {blocked ? (
          <Alert variant="destructive">
            <AlertTitle className="text-base font-bold">{t("master:delete.refused")}</AlertTitle>
            <AlertDescription className="text-base">
              <ul className="m-0 list-disc pl-5">
                {blocked.map((place) => (
                  <li key={place.kind}>{usedText(place)}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {children({ form, record, readOnly, reload })}

        <div className="flex flex-wrap items-center gap-3">
          {readOnly ? null : (
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Save aria-hidden="true" />{form.formState.isSubmitting ? t("common:actions.saving") : t("common:actions.save")}
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to={listPath}>
              {readOnly ? <ArrowLeft aria-hidden="true" /> : <X aria-hidden="true" />}
              {readOnly ? t("master:form.back") : t("common:actions.cancel")}
            </Link>
          </Button>
          {record && actions ? actions({ record, reload }) : null}
          {readOnly || isNew ? null : (
            <Button type="button" variant="destructive" className="ml-auto" onClick={() => setAsking(true)}>
              <Trash2 aria-hidden="true" />{t("master:delete.button")}
            </Button>
          )}
        </div>
      </form>

      {record && after ? <div className="mt-8 flex max-w-4xl flex-col gap-5">{after({ record, reload })}</div> : null}

      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title={t("master:delete.title")}
        text={t("master:delete.text", { name: record ? titleOf(record) : "" })}
        onConfirm={remove}
      />
    </>
  );
}
