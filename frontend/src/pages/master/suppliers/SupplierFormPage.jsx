import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ActiveBadge } from "@/components/common/ActiveBadge";
import { DetailSheet } from "@/components/common/DetailSheet";
import { FormField } from "@/components/common/FormField";
import { FormFooter } from "@/components/common/FormFooter";
import { FormSection } from "@/components/common/FormSection";
import { RecordDialogs } from "@/components/common/RecordDialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_TERMS } from "@/config/masterData";
import { useRecordForm } from "@/hooks/useRecordForm";
import { supplierService } from "@/services/supplier.service";
import { formatDateTime } from "@/utils/format";

import { SupplierMaterialsTab } from "../shared/SupplierMaterialsTab";
import { EMPTY_SUPPLIER, supplierSchema, toFormValues, toPayload } from "./supplierSchema";

/** M2 — /master/suppliers/new and /master/suppliers/:id (tabs: Details, Materials supplied) */
export function SupplierFormPage() {
  const { t, i18n } = useTranslation(["master", "nav"]);
  const page = useRecordForm({
    service: supplierService,
    schema: supplierSchema,
    emptyValues: EMPTY_SUPPLIER,
    toValues: toFormValues,
    toPayload,
    listPath: "/master/suppliers",
    idPrefix: "supplier",
  });
  const { isNew, record, loadState, form, errors, message, fieldProps, leaving, goToList, listPath } = page;
  const title = t("nav:items.suppliers");

  if (loadState === "loading") {
    return (
      <DetailSheet open={!leaving} title={title} onClose={goToList}>
        <div className="flex flex-col gap-5 p-6" aria-busy="true">
          <Skeleton className="h-64 w-full" />
        </div>
      </DetailSheet>
    );
  }
  if (loadState !== "ready") {
    return (
      <DetailSheet open={!leaving} title={title} onClose={goToList}>
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
  const text = (name, label, extra = {}) => (
    <FormField id={`supplier-${name}`} label={label} error={message(errors[name])}>
      <Input id={`supplier-${name}`} {...extra} {...fieldProps(name)} {...form.register(name)} />
    </FormField>
  );

  return (
    <>
      <DetailSheet
        open={!leaving}
        title={isNew ? t("master:suppliers.new") : `${record.code} · ${record.name}`}
        badge={!isNew ? <ActiveBadge status={record.status} /> : null}
        onClose={goToList}
      >
        <Tabs defaultValue="details" className="min-h-0 flex-1">
          <TabsList>
            <TabsTrigger value="details">{t("master:common.tabDetails")}</TabsTrigger>
            <TabsTrigger value="materials" disabled={isNew}>
              {t("master:suppliers.tabMaterials")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <form noValidate onSubmit={page.onSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
                <FormSection title={t("master:suppliers.form.sections.basic")}>
                  <FormField
                    id="supplier-code"
                    label={t("master:common.code")}
                    required
                    error={message(errors.code)}
                    hint={isNew ? undefined : t("master:common.codeFixed")}
                  >
                    <Input
                      id="supplier-code"
                      autoFocus={isNew}
                      readOnly={!isNew}
                      placeholder={t("master:suppliers.form.placeholders.code")}
                      className={isNew ? undefined : "bg-muted"}
                      {...fieldProps("code", !isNew)}
                      {...form.register("code")}
                    />
                  </FormField>
                  <FormField id="supplier-name" label={t("master:common.name")} required error={message(errors.name)}>
                    <Input id="supplier-name" {...fieldProps("name")} {...form.register("name")} />
                  </FormField>
                  {text("taxId", t("master:customers.form.fields.taxId"), { placeholder: t("master:customers.form.placeholders.taxId") })}
                  <FormField id="supplier-paymentTerms" label={t("master:customers.form.fields.paymentTerms")} error={message(errors.paymentTerms)}>
                    <Controller
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="supplier-paymentTerms" className="w-full" {...fieldProps("paymentTerms")}>
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
                  <FormField id="supplier-address" label={t("master:customers.form.fields.address")} error={message(errors.address)} className="md:col-span-2">
                    <Textarea id="supplier-address" {...fieldProps("address")} {...form.register("address")} />
                  </FormField>
                </FormSection>

                <FormSection title={t("master:suppliers.form.sections.contact")}>
                  {text("contactPerson", t("master:customers.form.fields.contactPerson"))}
                  {text("contactPhone", t("master:customers.form.fields.contactPhone"), { type: "tel" })}
                  {text("contactEmail", t("master:customers.form.fields.contactEmail"), { type: "email" })}
                </FormSection>

                {!isNew ? (
                  <p className="text-sm text-muted-foreground">
                    {t("master:common.createdAt")} {formatDateTime(record.createdAt, i18n.language)} · {t("master:common.updatedAt")}{" "}
                    {formatDateTime(record.updatedAt, i18n.language)}
                  </p>
                ) : null}
              </div>

              <FormFooter inSheet isSubmitting={page.isSubmitting} onCancel={goToList}>
                {!isNew ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => page.setDialog("status")}>
                      {isActive ? t("master:common.deactivate") : t("master:common.reactivate")}
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => page.setDialog("delete")}>
                      {t("master:common.delete")}
                    </Button>
                  </>
                ) : null}
              </FormFooter>
            </form>
          </TabsContent>

          <TabsContent value="materials">{!isNew ? <SupplierMaterialsTab mode="supplier" ownerId={record.id} /> : null}</TabsContent>
        </Tabs>
      </DetailSheet>

      <RecordDialogs
        dialog={page.dialog}
        setDialog={page.setDialog}
        isActive={isActive}
        busy={page.busy}
        onToggleStatus={page.toggleStatus}
        onRemove={page.remove}
        onLeave={() => page.exitTo(listPath)}
        name={t("master:suppliers.singular")}
      />
    </>
  );
}
