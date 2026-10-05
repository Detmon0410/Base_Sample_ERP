import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router";
import { toast } from "sonner";

import { useSheetExit } from "@/hooks/useSheetExit";
import { describedBy } from "@/utils/aria";
import { notifyMasterChanged } from "@/utils/masterEvents";

// Server field error codes -> message keys.
const FIELD_ERROR_KEYS = {
  REQUIRED: "master:validation.required",
  INVALID_EMAIL: "master:validation.emailInvalid",
};

/**
 * Everything a master data form in a sheet needs: load the record, validate, save, deactivate / reactivate,
 * delete, warn about unsaved changes, close with the slide-out animation.
 *
 *   service      createCrud(...) of the resource
 *   schema       zod schema of the form values
 *   emptyValues  values of a new record
 *   toValues(record) -> form values        toPayload(values) -> request body (default: values as they are)
 *   listPath     list route, e.g. "/master/materials" (the list's query string is kept)
 *   idPrefix     prefix of the field element ids
 */
export function useRecordForm({ service, schema, emptyValues, toValues, toPayload = (values) => values, listPath: basePath, idPrefix }) {
  const { t } = useTranslation("master");
  const { id } = useParams();
  const { search } = useLocation();
  const { leaving, exitTo } = useSheetExit();
  const isNew = id === undefined;
  const listPath = `${basePath}${search}`;

  const [record, setRecord] = useState(null);
  const [loadState, setLoadState] = useState(isNew ? "ready" : "loading");
  const [dialog, setDialog] = useState(null); // "status" | "delete" | "leave" | null
  const [busy, setBusy] = useState(false);

  const form = useForm({ resolver: zodResolver(schema), defaultValues: emptyValues });
  const {
    reset,
    setError,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  useEffect(() => {
    if (isNew) return undefined;
    let cancelled = false;
    service
      .get(id)
      .then((loaded) => {
        if (cancelled) return;
        setRecord(loaded);
        reset(toValues(loaded));
        setLoadState("ready");
      })
      .catch((error) => {
        if (!cancelled) setLoadState(error?.status === 404 ? "notFound" : "error");
      });
    return () => {
      cancelled = true;
    };
    // toValues is a stable module function in every caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, reset, service]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const message = (error) => (error?.message ? t(error.message.replace(/^master:/, "")) : undefined);
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
      toast.error(t(`errors.${error?.code}`, { defaultValue: t("errors.UNKNOWN") }));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isNew) {
        await service.create(toPayload(values));
        toast.success(t("common.saved"));
        notifyMasterChanged();
        exitTo(listPath);
      } else {
        const saved = await service.update(id, toPayload(values));
        setRecord(saved);
        reset(toValues(saved));
        toast.success(t("common.saved"));
        notifyMasterChanged();
      }
    } catch (error) {
      handleServerError(error);
    }
  });

  const goToList = () => (isDirty ? setDialog("leave") : exitTo(listPath));

  const toggleStatus = async () => {
    setBusy(true);
    try {
      const next = record.status === "active" ? "inactive" : "active";
      setRecord(await service.setStatus(id, next));
      notifyMasterChanged();
      toast.success(t(next === "inactive" ? "common.deactivated" : "common.reactivated"));
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
      toast.success(t("common.deleted"));
      notifyMasterChanged();
      exitTo(listPath);
    } catch (error) {
      setDialog(null);
      handleServerError(error);
    } finally {
      setBusy(false);
    }
  };

  return {
    id,
    isNew,
    record,
    loadState,
    form,
    errors,
    isSubmitting,
    dialog,
    setDialog,
    busy,
    leaving,
    exitTo,
    listPath,
    goToList,
    onSubmit,
    toggleStatus,
    remove,
    message,
    fieldProps,
  };
}
