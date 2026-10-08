import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useSheetExit } from "@/hooks/useSheetExit";
import { markRowSeen } from "@/utils/rowSeen";
import { describedBy } from "@/utils/aria";
import { notifyMasterChanged } from "@/utils/masterEvents";
import { getCachedRecord, rememberRecords } from "@/utils/recordCache";

// While a saved record is still loading, `record` is this empty object instead of null. The page builds its whole
// JSX (including `record.id`, `record.onHand`…) before the sheet decides to show the loading state, so a null would
// crash a deep link or a reload with a white screen. The sheet never shows these empty values.
const NOT_LOADED = Object.freeze({});

// Server field error codes -> message keys.
const FIELD_ERROR_KEYS = {
  REQUIRED: "master:validation.required",
  INVALID_EMAIL: "master:validation.emailInvalid",
  DATE_ORDER: "master:validation.dateOrder",
  DUPLICATE: "sale:validation.duplicate",
  PO_NUMBER_EXISTS: "sale:validation.poNumberExists",
  TOO_MANY: "factory:validation.tooMany",
  HAS_MOVEMENTS: "stock:validation.openingNotAllowed",
  NOT_SUPPLIED: "purchase:validation.notSupplied",
  INACTIVE: "purchase:validation.inactive",
  TOO_LONG: "sale:validation.maxLength",
  ADMIN_ALONE: "users:validation.adminAlone",
  WEAK_PASSWORD: "users:validation.weakPassword",
  SERIALS_REQUIRED: "sale:serials.required",
  NOT_AVAILABLE: "sale:serials.notAvailable",
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
 *   fieldErrors  server error code -> form field that shows it, e.g. { PERIOD_OVERLAP: "validFrom" }
 *                (CODE_ALREADY_EXISTS -> "code" is always known)
 *   afterCreatePath(saved) -> path   stay in a sheet after creating (documents open on the new record)
 *                instead of going back to the list
 */
export function useRecordForm({
  service,
  schema,
  emptyValues,
  toValues,
  toPayload = (values) => values,
  listPath: basePath,
  idPrefix,
  fieldErrors = {},
  afterCreatePath,
}) {
  const { t } = useTranslation("master");
  const { id } = useParams();
  const { search } = useLocation();
  const { leaving, exitTo } = useSheetExit();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === undefined;
  const listPath = `${basePath}${search}`;

  // The row the list just showed fills the form at once; the full record is fetched in the background.
  const [cached] = useState(() => (isNew ? undefined : getCachedRecord(service.key, id)));
  const [record, setRecord] = useState(cached ?? null);
  const [loadState, setLoadState] = useState(isNew || cached ? "ready" : "loading");
  const [dialog, setDialog] = useState(null); // "status" | "delete" | "leave" | null
  const [busy, setBusy] = useState(false);

  const form = useForm({ resolver: zodResolver(schema), defaultValues: cached ? toValues(cached) : emptyValues });
  const {
    reset,
    setError,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = form;
  const dirtyRef = useRef(false);
  dirtyRef.current = isDirty;

  useEffect(() => {
    if (isNew) return undefined;
    let cancelled = false;
    service
      .get(id)
      .then((loaded) => {
        if (cancelled) return;
        setRecord(loaded);
        if (!dirtyRef.current) reset(toValues(loaded)); // never overwrite what the user has already typed
        setLoadState("ready");
      })
      .catch((error) => {
        if (!cancelled && !cached) setLoadState(error?.status === 404 ? "notFound" : "error");
      });
    return () => {
      cancelled = true;
    };
    // toValues is a stable module function in every caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, reset, service, cached]);

  // A row that the user opens is seen (its red dot goes away), and so is everything the user does to it while it is open: it is
  // marked when the sheet opens, after every save or action, and when it closes.
  const userId = user?.id ?? null;
  const markSeen = (rowId = id) => markRowSeen(userId, basePath, rowId == null ? null : String(rowId));
  const markSeenRef = useRef(markSeen);
  markSeenRef.current = markSeen;
  useEffect(() => {
    if (isNew) return undefined;
    markSeenRef.current();
    return () => markSeenRef.current();
  }, [id, isNew]);

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
    const field = { CODE_ALREADY_EXISTS: "code", ...fieldErrors }[error?.code];
    if (field) {
      setError(field, { message: `master:errors.${error.code}` });
    } else if (error?.code === "VALIDATION_ERROR" && Array.isArray(error.details)) {
      for (const item of error.details) {
        setError((item.path ?? []).join("."), { message: FIELD_ERROR_KEYS[item.message] ?? "master:errors.VALIDATION_ERROR" });
      }
    } else {
      toast.error(t(`errors.${error?.code}`, { defaultValue: t("errors.UNKNOWN") }));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isNew) {
        const created = await service.create(toPayload(values));
        markSeen(created?.id);
        toast.success(t("common.saved"));
        notifyMasterChanged();
        if (afterCreatePath) {
          rememberRecords(service.key, [created]);
          navigate(`${afterCreatePath(created)}${search}`, { replace: true });
        } else {
          exitTo(listPath);
        }
      } else {
        const saved = await service.update(id, toPayload(values));
        setRecord(saved);
        reset(toValues(saved));
        markSeen();
        toast.success(t("common.saved"));
        notifyMasterChanged();
      }
    } catch (error) {
      handleServerError(error);
    }
  });

  /** A record returned by the server (after a status action): show it and reload the lists behind the sheet. */
  const applyRecord = (saved) => {
    markSeen();
    setRecord(saved);
    reset(toValues(saved));
    notifyMasterChanged();
  };

  const goToList = () => (isDirty ? setDialog("leave") : exitTo(listPath));

  const toggleStatus = async () => {
    setBusy(true);
    try {
      const next = record.status === "active" ? "inactive" : "active";
      setRecord(await service.setStatus(id, next));
      markSeen();
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
    record: record ?? (isNew ? null : NOT_LOADED),
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
    applyRecord,
    toggleStatus,
    remove,
    message,
    fieldProps,
  };
}
