import { ListIcon, TruckIcon } from "lucide-react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DetailFields } from "@/components/common/DetailLayout";
import { DateField } from "@/components/common/DateField";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FormField } from "@/components/common/FormField";
import { SheetFormBody } from "@/components/common/RecordSheet";
import { SheetSection } from "@/components/common/SheetSection";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { HistoryCard, LinksCard } from "@/components/documents/DocumentInfoCards";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canWork, deliveryActions } from "@/config/sale";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { deliveryNoteService } from "@/services/sale.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatDate, formatNumber } from "@/utils/format";

import { saleErrorText } from "../saleErrors";
import { deliverySchema, emptyDelivery, toFormValues } from "./deliverySchema";

/** S8 — /sale/deliveries/:id. Delivery notes are made from a sale order, so there is no /new. */
export function DeliverySheet() {
  const { t, i18n } = useTranslation(["sale", "nav"]);
  const { user } = useAuth();
  const page = useRecordForm({
    service: deliveryNoteService,
    schema: deliverySchema,
    emptyValues: emptyDelivery(),
    toValues: toFormValues,
    listPath: "/sale/deliveries",
    idPrefix: "dn",
  });
  const { record, form, errors, message, fieldProps } = page;
  const { options: warehouses } = useOptions(simpleMasterServices.warehouses);

  const editable = record?.status === "draft" && canWork(user);
  const actions = record ? deliveryActions(record, user) : [];
  const finished = warehouses.filter((warehouse) => warehouse.type === "FINISHED_GOODS");

  const run = async (action, note) => {
    try {
      const saved = await deliveryNoteService.run(record.id, action.key, { note });
      page.applyRecord(saved);
      toast.success(t(`sale:actions.${action.key}.done`));
    } catch (error) {
      toast.error(saleErrorText(t, error));
      throw error;
    }
  };

  const lineError = (index) => errors.lines?.[index]?.deliverNow;
  const number = (value) => formatNumber(value, i18n.language);

  return (
    <DocumentSheet
      page={page}
      entityTitle={t("nav:items.deliveryNotes")}
      newTitle={t("nav:items.deliveryNotes")}
      titleOf={(doc) => doc.number}
      status={record?.status}
      singular={t("sale:deliveries.singular")}
      formId="dn-form"
      canEdit={editable}
      actions={<DocumentActions actions={actions} onRun={run} disabled={form.formState.isDirty} />}
    >
      <SheetFormBody>
        <form id="dn-form" noValidate onSubmit={page.onSubmit} className="flex flex-col gap-4">
          {record ? (
            <SheetSection title={t("sale:deliveries.cardHeader")} icon={TruckIcon}>
              {editable ? (
                <div className="grid gap-x-6 gap-y-5 @lg:grid-cols-2">
                  <FormField id="dn-date" label={t("sale:fields.date")} required error={message(errors.date)}>
                    <DateField id="dn-date" control={form.control} name="date" clearable={false} {...fieldProps("date")} />
                  </FormField>
                  <FormField id="dn-warehouseId" label={t("sale:fields.warehouse")} required error={message(errors.warehouseId)}>
                    <Controller
                      control={form.control}
                      name="warehouseId"
                      render={({ field }) => <EntitySelect id="dn-warehouseId" options={finished} value={field.value} onChange={field.onChange} placeholder={t("sale:fields.warehouse")} {...fieldProps("warehouseId")} />}
                    />
                  </FormField>
                  <div className="@lg:col-span-2">
                    <DetailFields
                      items={[
                        { label: t("sale:fields.saleOrder"), value: record.saleOrderNumber },
                        { label: t("sale:fields.customer"), value: `${record.customerCode} · ${record.customerName}` },
                      ]}
                    />
                  </div>
                </div>
              ) : (
                <DetailFields
                  items={[
                    { label: t("sale:fields.saleOrder"), value: record.saleOrderNumber },
                    { label: t("sale:fields.customer"), value: `${record.customerCode} · ${record.customerName}` },
                    { label: t("sale:fields.date"), value: formatDate(record.date, i18n.language) },
                    { label: t("sale:fields.warehouse"), value: record.warehouseName },
                  ]}
                />
              )}
            </SheetSection>
          ) : null}

          {record ? (
            <SheetSection title={t("sale:deliveries.cardLines")} icon={ListIcon}>
              {record.lines.length === 0 ? (
                <p className="text-muted-foreground">{t("sale:deliveries.emptyLines")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sale:lines.product")}</TableHead>
                      <TableHead className="text-right">{t("sale:deliveries.ordered")}</TableHead>
                      <TableHead className="text-right">{t("sale:deliveries.deliveredBefore")}</TableHead>
                      <TableHead className="text-right">{t("sale:deliveries.remaining")}</TableHead>
                      <TableHead className="text-right">{t("sale:deliveries.deliverNow")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {record.lines.map((line, index) => (
                      <TableRow key={line.productId}>
                        <TableCell className="font-semibold whitespace-normal">
                          {line.productCode} <span className="font-normal text-muted-foreground">· {line.productName}</span>
                        </TableCell>
                        <TableCell className="text-right">{number(line.ordered)}</TableCell>
                        <TableCell className="text-right">{number(line.deliveredBefore)}</TableCell>
                        <TableCell className="text-right">{number(line.remaining)}</TableCell>
                        <TableCell className="w-36 text-right">
                          {editable ? (
                            <>
                              <Input
                                type="number"
                                min={0}
                                max={line.remaining + line.deliverNow}
                                step={1}
                                inputMode="numeric"
                                className="text-right"
                                aria-label={`${t("sale:deliveries.deliverNow")}, ${line.productCode}`}
                                aria-invalid={lineError(index) ? true : undefined}
                                {...form.register(`lines.${index}.deliverNow`, { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })}
                              />
                              {lineError(index) ? <p className="mt-1 text-sm text-destructive">{t("sale:deliveries.qtyInvalid")}</p> : null}
                            </>
                          ) : (
                            <span className="font-semibold">{number(line.deliverNow)}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {errors.lines?.message || errors.lines?.root?.message ? (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {t(errors.lines.message ?? errors.lines.root.message)}
                </p>
              ) : null}
            </SheetSection>
          ) : null}
        </form>

        {record ? (
          <>
            <HistoryCard history={record.history} />
            <LinksCard links={record.links} />
          </>
        ) : null}
      </SheetFormBody>
    </DocumentSheet>
  );
}
