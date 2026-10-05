import { TriangleAlertIcon } from "lucide-react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ActiveBadge } from "@/components/common/ActiveBadge";
import { DetailSheet } from "@/components/common/DetailSheet";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FormField } from "@/components/common/FormField";
import { FormFooter } from "@/components/common/FormFooter";
import { FormSection } from "@/components/common/FormSection";
import { RecordDialogs } from "@/components/common/RecordDialogs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { materialService } from "@/services/material.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatDateTime, formatNumber } from "@/utils/format";

import { SupplierMaterialsTab } from "../shared/SupplierMaterialsTab";
import { EMPTY_MATERIAL, materialSchema, toFormValues } from "./materialSchema";

const parseNumber = (value) => (value === "" || value == null ? null : Number(value));

/** M4 — /master/materials/new and /master/materials/:id (tabs: Details, Suppliers) */
export function MaterialFormPage() {
  const { t, i18n } = useTranslation(["master", "nav"]);
  const page = useRecordForm({
    service: materialService,
    schema: materialSchema,
    emptyValues: EMPTY_MATERIAL,
    toValues: toFormValues,
    listPath: "/master/materials",
    idPrefix: "material",
  });
  const { isNew, record, loadState, form, errors, message, fieldProps, leaving, goToList, listPath } = page;
  const { options: uoms } = useOptions(simpleMasterServices.uom);
  const title = t("nav:items.materials");

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
  const shortage = !isNew && record.onHand != null && record.onHand <= record.reorderPoint;
  const uomOptions = uoms.map((unit) => ({ ...unit, id: unit.code }));
  const number = { type: "number", step: "any", min: 0, inputMode: "decimal", className: "text-right" };

  return (
    <>
      <DetailSheet
        open={!leaving}
        title={isNew ? t("master:materials.new") : `${record.code} · ${record.name}`}
        badge={!isNew ? <ActiveBadge status={record.status} /> : null}
        onClose={goToList}
      >
        <Tabs defaultValue="details" className="min-h-0 flex-1">
          <TabsList>
            <TabsTrigger value="details">{t("master:common.tabDetails")}</TabsTrigger>
            <TabsTrigger value="suppliers" disabled={isNew}>
              {t("master:materials.tabSuppliers")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <form noValidate onSubmit={page.onSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
                <FormSection title={t("master:materials.form.sections.basic")}>
                  <FormField
                    id="material-code"
                    label={t("master:common.code")}
                    required
                    error={message(errors.code)}
                    hint={isNew ? undefined : t("master:common.codeFixed")}
                  >
                    <Input
                      id="material-code"
                      autoFocus={isNew}
                      readOnly={!isNew}
                      placeholder={t("master:materials.form.placeholders.code")}
                      className={isNew ? undefined : "bg-muted"}
                      {...fieldProps("code", !isNew)}
                      {...form.register("code")}
                    />
                  </FormField>
                  <FormField id="material-name" label={t("master:common.name")} required error={message(errors.name)}>
                    <Input id="material-name" {...fieldProps("name")} {...form.register("name")} />
                  </FormField>
                  <FormField id="material-uom" label={t("master:materials.form.fields.uom")} required error={message(errors.uom)}>
                    <Controller
                      control={form.control}
                      name="uom"
                      render={({ field }) => (
                        <EntitySelect
                          id="material-uom"
                          options={uomOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t("master:materials.form.placeholders.uom")}
                          {...fieldProps("uom")}
                        />
                      )}
                    />
                  </FormField>
                </FormSection>

                <FormSection title={t("master:materials.form.sections.reorder")}>
                  <FormField
                    id="material-reorderPoint"
                    label={t("master:materials.form.fields.reorderPoint")}
                    required
                    error={message(errors.reorderPoint)}
                    hint={t("master:materials.form.hints.reorderPoint")}
                  >
                    <Input
                      id="material-reorderPoint"
                      {...number}
                      {...fieldProps("reorderPoint", true)}
                      {...form.register("reorderPoint", { setValueAs: parseNumber })}
                    />
                  </FormField>
                  <FormField
                    id="material-reorderQty"
                    label={t("master:materials.form.fields.reorderQty")}
                    error={message(errors.reorderQty)}
                    hint={t("master:materials.form.hints.reorderQty")}
                  >
                    <Input
                      id="material-reorderQty"
                      {...number}
                      {...fieldProps("reorderQty", true)}
                      {...form.register("reorderQty", { setValueAs: parseNumber })}
                    />
                  </FormField>
                </FormSection>

                {!isNew ? (
                  <section className="rounded-xl border bg-muted/40 p-6" aria-labelledby="material-stock-title">
                    <h2 id="material-stock-title" className="mb-3 text-lg font-bold">
                      {t("master:materials.form.sections.stock")}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xl font-bold">
                        {formatNumber(record.onHand ?? 0, i18n.language)} {record.uom}
                      </p>
                      {shortage ? (
                        <StatusBadge tone="danger" icon={TriangleAlertIcon}>
                          {t("master:materials.shortage")}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="success">{t("master:materials.stockOk")}</StatusBadge>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{t("master:materials.form.hints.onHand")}</p>
                  </section>
                ) : null}

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

          <TabsContent value="suppliers">{!isNew ? <SupplierMaterialsTab mode="material" ownerId={record.id} /> : null}</TabsContent>
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
        name={t("master:materials.singular")}
      />
    </>
  );
}
