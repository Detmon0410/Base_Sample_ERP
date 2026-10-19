import { ArrowLeft, ArrowLeftRight, Boxes, History, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";

import { NativeSelect, Section, SelectField, TextField } from "@/components/common/FormFields";
import { StockStatus } from "@/components/common/StockStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useLoad } from "@/hooks/useLoad";
import { materialsApi, stockApi } from "@/services/master.service";
import { ordersApi } from "@/services/orders.service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { todayIso } from "@/utils/dates";
import { formatDateTime, formatNumber } from "@/utils/format";
import { applyServerErrors } from "@/utils/serverErrors";

const NEW_LOT = "__new__";
const KINDS = ["Add", "Deduct", "Adjust"];

/** The form of one stock change: add, deduct or adjust a lot of this material (Admin). */
function ChangeForm({ material, onDone }) {
  const { t } = useTranslation(["master", "common"]);
  const [summary, setSummary] = useState(null);
  const orders = useLoad(() => ordersApi.list({ pageSize: 200 }), []);
  // "Add stock" of a production order that could not start: ?add=<what is missing>&order=<the order> opens this form ready to add it
  const [params] = useSearchParams();
  const missing = Number(params.get("add"));
  const fromOrder = params.get("order");
  const refill = Number.isFinite(missing) && missing > 0;
  const lastLot = material.lots.at(-1)?.lotNumber ?? NEW_LOT;
  const form = useForm({ defaultValues: { kind: "Add", lot: refill ? lastLot : "", newLot: refill && material.lots.length === 0 ? `LOT-${todayIso().replaceAll("-", "")}` : "", quantity: refill ? String(missing) : "", changeDate: todayIso(), orderId: "", note: refill ? t("master:stock.refillNote") : "" } });
  const section = useRef(null);
  useEffect(() => {
    if (refill) section.current?.scrollIntoView?.({ block: "start" });
  }, [refill]);
  const errors = form.formState.errors;
  const kind = useWatch({ control: form.control, name: "kind" });
  const lot = useWatch({ control: form.control, name: "lot" });

  const lotOptions = [
    { value: "", label: t("master:stock.chooseLot") },
    ...material.lots.map((item) => ({ value: item.lotNumber, label: `${item.lotNumber} (${formatNumber(item.quantity)})` })),
    ...(kind === "Add" ? [{ value: NEW_LOT, label: t("master:stock.newLot") }] : []),
  ];
  const orderOptions = [{ value: "", label: t("master:stock.noOrder") }, ...(orders.data?.items ?? []).map((order) => ({ value: String(order.id), label: `${order.orderNumber} ${order.customerName}` }))];

  const onSubmit = form.handleSubmit(async (values) => {
    setSummary(null);
    const lotNumber = values.lot === NEW_LOT ? values.newLot : values.lot;
    try {
      await stockApi.change(material.id, { kind: values.kind, lotNumber, quantity: values.quantity, changeDate: values.changeDate, orderId: values.orderId, note: values.note });
      toast.success(t("master:stock.saved"));
      form.reset({ ...values, lot: "", newLot: "", quantity: "", orderId: "", note: "" });
      onDone();
    } catch (error) {
      // the server names the field "lotNumber"; on this form it is the lot select or the new lot field
      const message = applyServerErrors(form, error, t);
      const lotError = form.getFieldState("lotNumber").error;
      if (lotError) form.setError(values.lot === NEW_LOT ? "newLot" : "lot", lotError);
      setSummary(message);
    }
  });

  return (
    <div ref={section}>
    <Section icon={ArrowLeftRight} title={t("master:stock.changeTitle")}>
      {fromOrder ? (
        <p className="mb-4">
          <Link to={`/sale/orders/${fromOrder}`} className="inline-flex items-center gap-2">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("master:stock.backToOrder")}
          </Link>
        </p>
      ) : null}
      <form noValidate onSubmit={onSubmit} onChange={() => setSummary(null)} className="flex flex-col gap-5">
        {summary ? (
          <Alert variant="destructive">
            <AlertDescription className="text-base">{summary}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={errors.kind ? true : undefined}>
            <FieldLabel className="text-sm font-semibold">{t("master:stock.kind")}</FieldLabel>
            <NativeSelect aria-label={t("master:stock.kind")} options={KINDS.map((value) => ({ value, label: t(`master:stock.kinds.${value}`) }))} {...form.register("kind", { onChange: () => form.setValue("lot", "") })} />
            {errors.kind ? <FieldError>{errors.kind.message}</FieldError> : null}
          </Field>
          <SelectField label={t("master:stock.lot")} options={lotOptions} error={errors.lot?.message} {...form.register("lot")} />
          {lot === NEW_LOT ? <TextField label={t("master:stock.newLotNumber")} placeholder={t("examples:lotNumber")} error={errors.newLot?.message} {...form.register("newLot")} /> : null}
          <TextField label={t("master:stock.changeQuantity")} placeholder={t("examples:lotQuantity")} type="number" step="0.001" error={errors.quantity?.message} {...form.register("quantity")} />
          <TextField label={t("master:stock.changeDate")} placeholder={t("examples:date")} inputMode="numeric" error={errors.changeDate?.message} {...form.register("changeDate")} />
          <SelectField label={t("master:stock.order")} options={orderOptions} error={errors.orderId?.message} {...form.register("orderId")} />
          <TextField label={t("master:stock.note")} placeholder={t("examples:changeNote")} error={errors.note?.message} className="sm:col-span-2" {...form.register("note")} />
          {kind === "Adjust" ? <p className="text-sm text-muted-foreground sm:col-span-2">{t("master:stock.adjustHint")}</p> : null}
        </div>
        <div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <Save aria-hidden="true" />{form.formState.isSubmitting ? t("common:actions.saving") : t("master:stock.save")}
          </Button>
        </div>
      </form>
    </Section>
    </div>
  );
}

/**
 * Under the page of a material: its lots with the quantities (read only), the form of a stock change (Admin) and the history of
 * every change - the lot, the change, the balance after it, the production order, who and when.
 */
export function StockChanges({ materialId, canChange }) {
  const { t, i18n } = useTranslation("master");
  const language = i18n.language;
  const material = useLoad(() => materialsApi.get(materialId), [materialId]);
  const history = useLoad(() => stockApi.history(materialId), [materialId]);

  if (!material.data || !history.data) return null;
  const lots = material.data.lots;
  const total = lots.reduce((sum, lot) => sum + lot.quantity, 0);
  const changed = () => {
    material.reload();
    history.reload();
  };

  return (
    <div className="mt-6 flex max-w-4xl flex-col gap-5">
      <Section icon={Boxes} title={t("stock.lotsTitle")}>
        <p className="mb-3 text-sm text-muted-foreground">{t("stock.lotsHint")}</p>
        {lots.length === 0 ? (
          <p className="text-muted-foreground">{t("stock.noLots")}</p>
        ) : (
          <Table data-stack>
            <TableHeader>
              <TableRow>
                <TableHead>{t("stock.lotNumber")}</TableHead>
                <TableHead>{t("stock.quantity")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => (
                <TableRow key={lot.lotNumber}>
                  <TableCell data-label={t("stock.lotNumber")}>{lot.lotNumber}</TableCell>
                  <TableCell data-label={t("stock.quantity")}>{formatNumber(lot.quantity, language)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-bold">{t("stock.total")}</TableCell>
                <TableCell className="font-bold">
                  {formatNumber(total, language)} {material.data.stockStatus ? <StockStatus status={material.data.stockStatus} /> : null}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Section>

      {canChange ? <ChangeForm material={material.data} onDone={changed} /> : null}

      <Section icon={History} title={t("stock.historyTitle")}>
        {history.data.length === 0 ? (
          <p className="text-muted-foreground">{t("stock.noHistory")}</p>
        ) : (
          <Table data-stack>
            <TableHeader>
              <TableRow>
                <TableHead>{t("stock.colDate")}</TableHead>
                <TableHead>{t("stock.colType")}</TableHead>
                <TableHead>{t("stock.colLot")}</TableHead>
                <TableHead>{t("stock.colChange")}</TableHead>
                <TableHead>{t("stock.colBalance")}</TableHead>
                <TableHead>{t("stock.colOrder")}</TableHead>
                <TableHead>{t("stock.colNote")}</TableHead>
                <TableHead>{t("stock.colBy")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell data-label={t("stock.colDate")} title={formatDateTime(entry.at, language)}>
                    {entry.changeDate}
                  </TableCell>
                  <TableCell data-label={t("stock.colType")}>{t(`stock.kinds.${entry.kind}`)}</TableCell>
                  <TableCell data-label={t("stock.colLot")}>{entry.lotNumber}</TableCell>
                  <TableCell data-label={t("stock.colChange")}>{`${entry.change > 0 ? "+" : ""}${formatNumber(entry.change, language)}`}</TableCell>
                  <TableCell data-label={t("stock.colBalance")}>{formatNumber(entry.balance, language)}</TableCell>
                  <TableCell data-label={t("stock.colOrder")}>{entry.orderNumber || entry.purchaseOrderNumber}</TableCell>
                  <TableCell data-label={t("stock.colNote")} className="whitespace-normal">
                    {entry.note}
                  </TableCell>
                  <TableCell data-label={t("stock.colBy")}>{entry.userName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}
