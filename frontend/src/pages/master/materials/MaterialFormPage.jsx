import { BoxIcon, FileTextIcon, LinkIcon, RepeatIcon, TriangleAlertIcon, TruckIcon, WarehouseIcon } from "lucide-react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { EntitySelect } from "@/components/common/EntitySelect";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { RecordInfoCard } from "@/components/common/RecordInfoCard";
import { RecordSheet, SheetFormBody } from "@/components/common/RecordSheet";
import { SheetSection } from "@/components/common/SheetSection";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { materialService } from "@/services/material.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatNumber } from "@/utils/format";

import { SupplierMaterialsTab } from "../shared/SupplierMaterialsTab";
import { MaterialUsedInTab } from "./MaterialUsedInTab";
import { EMPTY_MATERIAL, materialSchema, toFormValues } from "./materialSchema";

const parseNumber = (value) => (value === "" || value == null ? null : Number(value));
const NUMBER_INPUT = { type: "number", step: "any", min: 0, inputMode: "decimal", className: "text-right" };

/** M4 — /master/materials/new and /master/materials/:id (tabs: Details, Suppliers, Used in) */
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
  const { isNew, record, form, errors, message, fieldProps } = page;
  const { options: uoms } = useOptions(simpleMasterServices.uom);
  const uomOptions = uoms.map((unit) => ({ ...unit, id: unit.code }));
  const shortage = !isNew && record?.onHand != null && record.reorderPoint != null && record.onHand <= record.reorderPoint;

  return (
    <RecordSheet
      page={page}
      entityTitle={t("nav:items.materials")}
      newTitle={t("master:materials.new")}
      editTitle={t("master:materials.edit")}
      singular={t("master:materials.singular")}
      formId="material-form"
    >
      <Tabs defaultValue="details" className="min-h-0 flex-1">
        <TabsList>
          <TabsTrigger value="details">
            <FileTextIcon className="size-4" aria-hidden="true" /> {t("master:common.tabDetails")}
          </TabsTrigger>
          <TabsTrigger value="suppliers" disabled={isNew}>
            <TruckIcon className="size-4" aria-hidden="true" /> {t("master:materials.tabSuppliers")}
          </TabsTrigger>
          <TabsTrigger value="usedIn" disabled={isNew}>
            <LinkIcon className="size-4" aria-hidden="true" /> {t("master:materials.tabUsedIn")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" forceMount>
          <form id="material-form" noValidate onSubmit={page.onSubmit} className="flex min-h-0 flex-1 flex-col">
            <SheetFormBody>
              <FormSection title={t("master:materials.form.sections.basic")} icon={BoxIcon}>
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

              <FormSection title={t("master:materials.form.sections.reorder")} icon={RepeatIcon}>
                <FormField
                  id="material-reorderPoint"
                  label={t("master:materials.form.fields.reorderPoint")}
                  error={message(errors.reorderPoint)}
                  hint={t("master:materials.form.hints.reorderPoint")}
                >
                  <Input id="material-reorderPoint" {...NUMBER_INPUT} {...fieldProps("reorderPoint", true)} {...form.register("reorderPoint", { setValueAs: parseNumber })} />
                </FormField>
                <FormField
                  id="material-reorderQty"
                  label={t("master:materials.form.fields.reorderQty")}
                  error={message(errors.reorderQty)}
                  hint={t("master:materials.form.hints.reorderQty")}
                >
                  <Input id="material-reorderQty" {...NUMBER_INPUT} {...fieldProps("reorderQty", true)} {...form.register("reorderQty", { setValueAs: parseNumber })} />
                </FormField>
              </FormSection>

              {!isNew ? (
                <SheetSection title={t("master:materials.form.sections.stock")} icon={WarehouseIcon}>
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
                </SheetSection>
              ) : null}

              {!isNew ? <RecordInfoCard record={record} /> : null}
            </SheetFormBody>
          </form>
        </TabsContent>

        <TabsContent value="suppliers">{!isNew ? <SupplierMaterialsTab mode="material" ownerId={record.id} /> : null}</TabsContent>
        <TabsContent value="usedIn">{!isNew ? <MaterialUsedInTab materialId={record.id} unit={record.uom} /> : null}</TabsContent>
      </Tabs>
    </RecordSheet>
  );
}
