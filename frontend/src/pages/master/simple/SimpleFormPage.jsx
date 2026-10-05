import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router";
import { toast } from "sonner";

import { ActiveBadge } from "@/components/common/ActiveBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DetailSheet } from "@/components/common/DetailSheet";
import { FormField } from "@/components/common/FormField";
import { FormFooter } from "@/components/common/FormFooter";
import { FormSection } from "@/components/common/FormSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { describedBy } from "@/utils/aria";
import { formatDateTime } from "@/utils/format";
import { useSheetExit } from "@/hooks/useSheetExit";
import { notifyMasterChanged } from "@/utils/masterEvents";

import { buildSchema, emptyValues, toFormValues } from "./simpleSchema";

// Server field error codes -> message keys.
const FIELD_ERROR_KEYS = { REQUIRED: "master:validation.required" };

/** Create / edit form of a flat master data entity (config/simpleMaster.js). */
export function SimpleFormPage({ entity }) {
  const { t, i18n } = useTranslation(["master", "nav"]);
  const { leaving, exitTo } = useSheetExit();
  const { id } = useParams();
  const isNew = id === undefined;
  const service = simpleMasterServices[entity.key];
  // Keep the list's search / filter / page (they live in the URL) when the sheet opens and closes.
  const { search } = useLocation();
  const listPath = `${entity.path}${search}`;
  const idPrefix = `${entity.key}`;

  const schema = useMemo(() => buildSchema(entity), [entity]);
  const [record, setRecord] = useState(null);
  const [loadState, setLoadState] = useState(isNew ? "ready" : "loading");
  const [dialog, setDialog] = useState(null); // "status" | "delete" | "leave" | null
  const [busy, setBusy] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: emptyValues(entity) });

  useEffect(() => {
    if (isNew) return undefined;
    let cancelled = false;
    service
      .get(id)
      .then((loaded) => {
        if (cancelled) return;
        setRecord(loaded);
        reset(toFormValues(entity, loaded));
        setLoadState("ready");
      })
      .catch((error) => {
        if (!cancelled) setLoadState(error?.status === 404 ? "notFound" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew, reset, service, entity]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const message = (error) => (error?.message ? t(error.message) : undefined);
  const fieldProps = (name, hint) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": describedBy(`${idPrefix}-${name}`, { error: errors[name], hint }),
  });

  const handleServerError = (error) => {
    if (error?.code === "CODE_ALREADY_EXISTS") {
      setError("code", { message: "master:errors.CODE_ALREADY_EXISTS" });
    } else if (error?.code === "VALIDATION_ERROR" && Array.isArray(error.details)) {
      for (const item of error.details) {
        setError(item.path?.[0], { message: FIELD_ERROR_KEYS[item.message] ?? "master:errors.VALIDATION_ERROR" });
      }
    } else {
      toast.error(t(`master:errors.${error?.code}`, { defaultValue: t("master:errors.UNKNOWN") }));
    }
  };

  const onSubmit = async (values) => {
    try {
      if (isNew) {
        await service.create(values);
        toast.success(t("master:common.saved"));
        notifyMasterChanged();
        exitTo(listPath);
      } else {
        const saved = await service.update(id, values);
        setRecord(saved);
        reset(toFormValues(entity, saved));
        toast.success(t("master:common.saved"));
        notifyMasterChanged();
      }
    } catch (error) {
      handleServerError(error);
    }
  };

  const goToList = () => (isDirty ? setDialog("leave") : exitTo(listPath));

  const toggleStatus = async () => {
    setBusy(true);
    try {
      const next = record.status === "active" ? "inactive" : "active";
      setRecord(await service.setStatus(id, next));
      notifyMasterChanged();
      toast.success(t(next === "inactive" ? "master:common.deactivated" : "master:common.reactivated"));
      setDialog(null);
    } catch (error) {
      setDialog(null);
      handleServerError(error);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await service.remove(id);
      toast.success(t("master:common.deleted"));
      notifyMasterChanged();
      exitTo(listPath);
    } catch (error) {
      setDialog(null);
      handleServerError(error);
    } finally {
      setBusy(false);
    }
  };

  const pageTitle = t(`nav:${entity.nav}`);

  if (loadState === "loading") {
    return (
      <DetailSheet open={!leaving} title={pageTitle} onClose={goToList}>
        <div className="flex flex-col gap-5 p-6" aria-busy="true">
          <Skeleton className="h-64 w-full" />
        </div>
      </DetailSheet>
    );
  }
  if (loadState === "notFound" || loadState === "error") {
    return (
      <DetailSheet open={!leaving} title={pageTitle} onClose={goToList}>
        <div role="alert" className="m-6 flex flex-col items-start gap-4 rounded-xl border bg-card p-6">
          <p>{t(loadState === "notFound" ? "master:common.notFound" : "master:common.loadError")}</p>
          <Button asChild variant="outline">
            <Link to={listPath}>{t("master:common.backToList")}</Link>
          </Button>
        </div>
      </DetailSheet>
    );
  }

  const isActive = record?.status === "active";
  const singular = t(`master:${entity.key}.singular`);
  const heading = isNew ? t(`master:${entity.key}.new`) : `${record.code} · ${record.name}`;

  const renderField = (field) => {
    const id_ = `${idPrefix}-${field.name}`;
    const label = t(`master:${entity.key}.form.fields.${field.name}`);
    const placeholder = t(`master:${entity.key}.form.placeholders.${field.name}`, { defaultValue: "" });

    if (field.type === "select") {
      return (
        <FormField key={field.name} id={id_} label={label} required={field.required} error={message(errors[field.name])}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: controlled }) => (
              <Select value={controlled.value} onValueChange={controlled.onChange}>
                <SelectTrigger id={id_} className="w-full" {...fieldProps(field.name)}>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`master:${entity.key}.options.${field.name}.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      );
    }

    const isNumber = field.type === "number";
    return (
      <FormField key={field.name} id={id_} label={label} required={field.required} error={message(errors[field.name])}>
        <Input
          id={id_}
          type={isNumber ? "number" : "text"}
          inputMode={isNumber ? "numeric" : undefined}
          min={isNumber ? 0 : undefined}
          placeholder={placeholder || undefined}
          {...fieldProps(field.name)}
          {...register(
            field.name,
            isNumber ? { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) } : undefined,
          )}
        />
      </FormField>
    );
  };

  return (
    <>
      <DetailSheet open={!leaving} title={heading} badge={!isNew ? <ActiveBadge status={record.status} /> : null} onClose={goToList}>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">

        <FormSection title={t(`master:${entity.key}.form.section`)}>
          <FormField
            id={`${idPrefix}-code`}
            label={t("master:common.code")}
            required
            error={message(errors.code)}
            hint={isNew ? undefined : t("master:common.codeFixed")}
          >
            <Input
              id={`${idPrefix}-code`}
              autoFocus={isNew}
              readOnly={!isNew}
              placeholder={t(`master:${entity.key}.form.placeholders.code`)}
              className={isNew ? undefined : "bg-muted"}
              {...fieldProps("code", !isNew)}
              {...register("code")}
            />
          </FormField>
          <FormField id={`${idPrefix}-name`} label={t("master:common.name")} required error={message(errors.name)}>
            <Input id={`${idPrefix}-name`} {...fieldProps("name")} {...register("name")} />
          </FormField>
          {entity.fields.map(renderField)}
        </FormSection>

        {!isNew ? (
          <p className="text-sm text-muted-foreground">
            {t("master:common.createdAt")} {formatDateTime(record.createdAt, i18n.language)} · {t("master:common.updatedAt")}{" "}
            {formatDateTime(record.updatedAt, i18n.language)}
          </p>
        ) : null}

        </div>

        <FormFooter inSheet isSubmitting={isSubmitting} onCancel={goToList}>
          {!isNew ? (
            <>
              <Button type="button" variant="outline" onClick={() => setDialog("status")}>
                {isActive ? t("master:common.deactivate") : t("master:common.reactivate")}
              </Button>
              <Button type="button" variant="destructive" onClick={() => setDialog("delete")}>
                {t("master:common.delete")}
              </Button>
            </>
          ) : null}
        </FormFooter>
      </form>
      </DetailSheet>

      <ConfirmDialog
        open={dialog === "status"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t(isActive ? "master:generic.deactivateTitle" : "master:generic.reactivateTitle", { name: singular })}
        description={t(isActive ? "master:generic.deactivateDescription" : "master:generic.reactivateDescription")}
        confirmLabel={isActive ? t("master:common.deactivate") : t("master:common.reactivate")}
        cancelLabel={t("master:common.cancel")}
        onConfirm={toggleStatus}
        busy={busy}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("master:generic.deleteTitle", { name: singular })}
        description={t("master:generic.deleteDescription", { name: singular })}
        confirmLabel={busy ? t("master:common.deleting") : t("master:common.delete")}
        cancelLabel={t("master:common.cancel")}
        onConfirm={remove}
        destructive
        busy={busy}
      />
      <ConfirmDialog
        open={dialog === "leave"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("master:common.unsavedTitle")}
        description={t("master:common.unsavedDescription")}
        confirmLabel={t("master:common.leave")}
        cancelLabel={t("master:common.stay")}
        onConfirm={() => exitTo(listPath)}
      />
    </>
  );
}
