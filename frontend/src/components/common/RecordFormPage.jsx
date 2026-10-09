import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLoad } from "@/hooks/useLoad";
import { applyServerErrors } from "@/utils/serverErrors";

/**
 * The page of one record (a new one, or `/:id`): the title band with the status word, the fields (`children`), and Save / Cancel
 * at the bottom (docs/specs/s1-mini-erp-workflow.md, section 7b). Errors are shown only after Save; after Save the list opens.
 * A record is never deleted: an Admin makes it inactive (after a confirmation) or active again.
 *
 *   api        the calls of the resource (services/crud.js)
 *   listPath   where Cancel and a successful Save go
 *   newTitle   title of a new record;  titleOf(record) the title of an existing one
 *   defaults   the empty form;  toForm(record) -> form values;  toBody(values) -> what is sent
 *   readOnly   no Save and no status button (a Worker looking at products or materials)
 *   children   ({ form, record, readOnly }) => the fields
 */
export function RecordFormPage({ api, listPath, newTitle, titleOf, defaults, toForm, toBody, readOnly = false, children }) {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { t } = useTranslation(["master", "common"]);
  const [summary, setSummary] = useState(null);
  const [asking, setAsking] = useState(false);

  const { data: record, error: loadError, loading, reload } = useLoad(() => (isNew ? Promise.resolve(null) : api.get(id)), [id]);
  const form = useForm({ defaultValues: defaults, values: record ? toForm(record) : undefined });

  const show = (error) => setSummary(applyServerErrors(form, error, t));

  const onSubmit = form.handleSubmit(async (values) => {
    setSummary(null);
    try {
      if (isNew) await api.create(toBody(values));
      else await api.update(id, toBody(values));
      toast.success(t("master:form.saved"));
      navigate(listPath);
    } catch (error) {
      show(error);
    }
  });

  const changeStatus = async () => {
    setAsking(false);
    setSummary(null);
    try {
      await api.setStatus(id, record.status === "active" ? "inactive" : "active");
      toast.success(t("master:form.statusChanged"));
      reload();
    } catch (error) {
      show(error);
    }
  };

  if (loadError) {
    return (
      <>
        <PageHeader title={t("master:form.notFound")} />
        <p>
          <Link to={listPath}>{t("master:form.back")}</Link>
        </p>
      </>
    );
  }
  if (loading) return <PageHeader title={t("common:loading")} />;

  const active = record?.status === "active";

  return (
    <>
      <PageHeader title={isNew ? newTitle : titleOf(record)} status={record ? t(`master:status.${record.status}`) : null} />

      <form noValidate onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-5">
        {summary ? (
          <Alert variant="destructive">
            <AlertDescription className="text-base">{summary}</AlertDescription>
          </Alert>
        ) : null}

        {children({ form, record, readOnly })}

        <div className="flex flex-wrap items-center gap-3">
          {readOnly ? null : (
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("common:actions.saving") : t("common:actions.save")}
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to={listPath}>{readOnly ? t("master:form.back") : t("common:actions.cancel")}</Link>
          </Button>
          {readOnly || isNew ? null : (
            <Button type="button" variant={active ? "destructive" : "outline"} className="ml-auto" onClick={() => setAsking(true)}>
              {active ? t("master:form.makeInactive") : t("master:form.makeActive")}
            </Button>
          )}
        </div>
      </form>

      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{active ? t("master:form.inactiveTitle") : t("master:form.activeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{active ? t("master:form.inactiveText") : t("master:form.activeText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={changeStatus}>{t("common:actions.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
