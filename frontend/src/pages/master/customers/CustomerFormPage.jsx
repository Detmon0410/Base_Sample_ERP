import { zodResolver } from "@hookform/resolvers/zod";
import { CircleMinusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/common/FormField";
import { FormFooter } from "@/components/common/FormFooter";
import { FormSection } from "@/components/common/FormSection";
import { MoneyInput } from "@/components/common/MoneyInput";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_TERMS } from "@/config/masterData";
import { customerService } from "@/services/customer.service";
import { describedBy } from "@/utils/aria";
import { formatDateTime } from "@/utils/format";

import { customerSchema, EMPTY_CUSTOMER, toFormValues, toPayload } from "./customerSchema";

const LIST_PATH = "/master/customers";

// Server field error codes -> message keys.
const FIELD_ERROR_KEYS = { REQUIRED: "master:validation.required", INVALID_EMAIL: "master:validation.emailInvalid" };

/** M1 — /master/customers/new and /master/customers/:id */
export function CustomerFormPage() {
  const { t, i18n } = useTranslation(["master", "nav"]);
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === undefined;

  const [customer, setCustomer] = useState(null);
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
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY_CUSTOMER,
  });

  // Load the record being edited.
  useEffect(() => {
    if (isNew) return undefined;
    let cancelled = false;
    customerService
      .get(id)
      .then((record) => {
        if (cancelled) return;
        setCustomer(record);
        reset(toFormValues(record));
        setLoadState("ready");
      })
      .catch((error) => {
        if (!cancelled) setLoadState(error?.status === 404 ? "notFound" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew, reset]);

  // Browser reload / tab close with unsaved changes.
  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const message = (error) => (error?.message ? t(error.message) : undefined);
  const fieldProps = (name, hint) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": describedBy(`customer-${name}`, { error: errors[name], hint }),
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
        await customerService.create(toPayload(values));
        toast.success(t("master:common.saved"));
        navigate(LIST_PATH);
      } else {
        const saved = await customerService.update(id, toPayload(values));
        setCustomer(saved);
        reset(toFormValues(saved));
        toast.success(t("master:common.saved"));
      }
    } catch (error) {
      handleServerError(error);
    }
  };

  const goToList = () => (isDirty ? setDialog("leave") : navigate(LIST_PATH));

  const toggleStatus = async () => {
    setBusy(true);
    try {
      const next = customer.status === "active" ? "inactive" : "active";
      const saved = await customerService.setStatus(id, next);
      setCustomer(saved);
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
      await customerService.remove(id);
      toast.success(t("master:common.deleted"));
      navigate(LIST_PATH);
    } catch (error) {
      setDialog(null);
      handleServerError(error);
    } finally {
      setBusy(false);
    }
  };

  // ---- states other than the form ----
  if (loadState === "loading") {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <PageHeader title={t("nav:items.customers")} />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (loadState === "notFound" || loadState === "error") {
    return (
      <>
        <PageHeader title={t("nav:items.customers")} />
        <div role="alert" className="flex max-w-xl flex-col items-start gap-4 rounded-xl border bg-card p-6">
          <p>{t(loadState === "notFound" ? "master:common.notFound" : "master:common.loadError")}</p>
          <Button asChild variant="outline">
            <Link to={LIST_PATH}>{t("master:common.backToList")}</Link>
          </Button>
        </div>
      </>
    );
  }

  const isActive = customer?.status === "active";
  const title = isNew ? t("master:customers.new") : `${customer.code} · ${customer.name}`;

  return (
    <>
      <PageHeader title={t("nav:items.customers")} />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="mx-auto flex max-w-4xl flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          {!isNew ? (
            isActive ? (
              <StatusBadge tone="success">{t("master:common.active")}</StatusBadge>
            ) : (
              <StatusBadge tone="neutral" icon={CircleMinusIcon}>
                {t("master:common.inactive")}
              </StatusBadge>
            )
          ) : null}
        </div>

        <FormSection title={t("master:customers.form.sections.basic")}>
          <FormField
            id="customer-code"
            label={t("master:customers.form.fields.code")}
            required
            error={message(errors.code)}
            hint={isNew ? undefined : t("master:common.codeFixed")}
          >
            <Input
              id="customer-code"
              autoFocus={isNew}
              readOnly={!isNew}
              placeholder={t("master:customers.form.placeholders.code")}
              className={isNew ? undefined : "bg-muted"}
              {...fieldProps("code", !isNew)}
              {...register("code")}
            />
          </FormField>
          <FormField id="customer-name" label={t("master:customers.form.fields.name")} required error={message(errors.name)}>
            <Input id="customer-name" {...fieldProps("name")} {...register("name")} />
          </FormField>
          <FormField id="customer-taxId" label={t("master:customers.form.fields.taxId")} error={message(errors.taxId)}>
            <Input
              id="customer-taxId"
              placeholder={t("master:customers.form.placeholders.taxId")}
              {...fieldProps("taxId")}
              {...register("taxId")}
            />
          </FormField>
          <FormField
            id="customer-address"
            label={t("master:customers.form.fields.address")}
            error={message(errors.address)}
            className="md:col-span-2"
          >
            <Textarea id="customer-address" {...fieldProps("address")} {...register("address")} />
          </FormField>
        </FormSection>

        <FormSection title={t("master:customers.form.sections.billing")}>
          <FormField
            id="customer-paymentTerms"
            label={t("master:customers.form.fields.paymentTerms")}
            error={message(errors.paymentTerms)}
          >
            <Controller
              control={control}
              name="paymentTerms"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="customer-paymentTerms" className="w-full" {...fieldProps("paymentTerms")}>
                    <SelectValue placeholder={t("master:customers.form.placeholders.paymentTerms")} />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((term) => (
                      <SelectItem key={term} value={term}>
                        {t(`master:paymentTerms.${term}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            id="customer-creditLimit"
            label={t("master:customers.form.fields.creditLimit")}
            error={message(errors.creditLimit)}
          >
            <MoneyInput
              id="customer-creditLimit"
              placeholder={t("master:customers.form.placeholders.creditLimit")}
              {...fieldProps("creditLimit")}
              {...register("creditLimit", { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })}
            />
          </FormField>
        </FormSection>

        <FormSection title={t("master:customers.form.sections.contact")}>
          <FormField
            id="customer-contactPerson"
            label={t("master:customers.form.fields.contactPerson")}
            error={message(errors.contactPerson)}
          >
            <Input id="customer-contactPerson" {...fieldProps("contactPerson")} {...register("contactPerson")} />
          </FormField>
          <FormField
            id="customer-contactPhone"
            label={t("master:customers.form.fields.contactPhone")}
            error={message(errors.contactPhone)}
          >
            <Input id="customer-contactPhone" type="tel" {...fieldProps("contactPhone")} {...register("contactPhone")} />
          </FormField>
          <FormField
            id="customer-contactEmail"
            label={t("master:customers.form.fields.contactEmail")}
            error={message(errors.contactEmail)}
          >
            <Input id="customer-contactEmail" type="email" {...fieldProps("contactEmail")} {...register("contactEmail")} />
          </FormField>
        </FormSection>

        {!isNew ? (
          <p className="text-sm text-muted-foreground">
            {t("master:common.createdAt")} {formatDateTime(customer.createdAt, i18n.language)} ·{" "}
            {t("master:common.updatedAt")} {formatDateTime(customer.updatedAt, i18n.language)}
          </p>
        ) : null}

        <FormFooter isSubmitting={isSubmitting} onCancel={goToList}>
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

      <ConfirmDialog
        open={dialog === "status"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t(isActive ? "master:customers.form.deactivateTitle" : "master:customers.form.reactivateTitle")}
        description={t(isActive ? "master:customers.form.deactivateDescription" : "master:customers.form.reactivateDescription")}
        confirmLabel={isActive ? t("master:common.deactivate") : t("master:common.reactivate")}
        cancelLabel={t("master:common.cancel")}
        onConfirm={toggleStatus}
        busy={busy}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("master:customers.form.deleteTitle")}
        description={t("master:customers.form.deleteDescription")}
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
        onConfirm={() => navigate(LIST_PATH)}
      />
    </>
  );
}
