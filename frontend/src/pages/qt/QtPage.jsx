import { ClipboardCheck, Factory, FileText, Package, Plus, Trash2, UserCheck } from "lucide-react";
import { useId, useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes } from "react-router";
import { toast } from "sonner";

import { Attachments } from "@/components/common/Attachments";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FieldError } from "@/components/ui/field";
import { Section, SelectField, TextField } from "@/components/common/FormFields";
import { RecordFormPage } from "@/components/common/RecordFormPage";
import { RecordList } from "@/components/common/RecordList";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StepChain } from "@/components/common/StepChain";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useLoad } from "@/hooks/useLoad";
import { attachmentsApi } from "@/services/attachments.service";
import { customersApi, productsApi } from "@/services/master.service";
import { ordersApi } from "@/services/orders.service";
import { qtApi } from "@/services/qt.service";
import { todayIso } from "@/utils/dates";
import { formatCurrency } from "@/utils/format";

import { OrderForm } from "@/pages/orders/OrderForm";
import { OrderView } from "@/pages/orders/OrderView";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/utils/permissions";

import { QtDocument } from "./QtDocument";

const STEPS = ["Draft", "Confirmed", "InProduction", "Done"]; // where a job is: the QT, then its production order
const STEP_TONE = { Draft: "neutral", Confirmed: "warn", InProduction: "progress", Done: "good" };
const empty = () => ({ qtNumber: "", qtDate: todayIso(), customerId: "", notes: "", customerPoNumber: "", customerPoDate: "", lines: [] });

/** The lines of the QT: product, quantity, unit price (it starts from the price of the product), the amount of each and the total. */
function QtLines({ form, readOnly }) {
  const { t, i18n } = useTranslation(["master", "common"]);
  const { data } = useLoad(() => productsApi.list({ pageSize: 200 }), []);
  const products = data?.items ?? [];
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = useWatch({ control: form.control, name: "lines" }) ?? [];
  const errors = form.formState.errors.lines;
  const options = [{ value: "", label: t("qt.lines.chooseProduct") }, ...products.map((product) => ({ value: String(product.id), label: `${product.code} ${product.name}` }))];
  const amountOf = (line) => (Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0);
  const total = lines.reduce((sum, line) => sum + amountOf(line), 0);

  // the products are the options of the selects: wait for them, or a select of a saved line would start empty
  if (!data) return <Section icon={Package} title={t("qt.lines.title")}><p role="status">{t("common:loading")}</p></Section>;
  return (
    <Section icon={Package} title={t("qt.lines.title")}>
      {fields.length === 0 ? <p className="mb-3 text-muted-foreground">{t("qt.lines.none")}</p> : null}
      <div className="flex flex-col gap-4">
        {fields.map((field, index) => (
          <div key={field.id} className="grid items-start gap-4 sm:grid-cols-[1fr_8rem_10rem_10rem_auto]">
            <SelectField
              label={t("qt.lines.product")}
              options={options}
              disabled={readOnly}
              error={errors?.[index]?.productId?.message}
              {...form.register(`lines.${index}.productId`, {
                // the price of the product is the default price of the line
                onChange: (event) => {
                  const product = products.find((item) => String(item.id) === event.target.value);
                  if (product) form.setValue(`lines.${index}.unitPrice`, product.price);
                },
              })}
            />
            <TextField label={t("qt.lines.quantity")} type="number" min="1" step="1" disabled={readOnly} error={errors?.[index]?.quantity?.message} {...form.register(`lines.${index}.quantity`)} />
            <TextField label={t("qt.lines.unitPrice")} type="number" min="0" step="1" disabled={readOnly} error={errors?.[index]?.unitPrice?.message} {...form.register(`lines.${index}.unitPrice`)} />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">{t("qt.lines.amount")}</span>
              <span className="pt-2 font-bold">{formatCurrency(amountOf(lines[index]), i18n.language)}</span>
            </div>
            {readOnly ? null : (
              <Button type="button" variant="outline" size="icon" className="sm:mt-6" aria-label={t("qt.lines.remove")} title={t("qt.lines.remove")} onClick={() => remove(index)}>
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {errors?.message ? <FieldError className="mt-2">{errors.message}</FieldError> : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {readOnly ? <span /> : (
          <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: "", quantity: "", unitPrice: "" })}>
            <Plus aria-hidden="true" />
            {t("qt.lines.add")}
          </Button>
        )}
        <p className="text-2xl font-bold tabular-nums">
          {t("qt.lines.total")}: {formatCurrency(total, i18n.language)}
        </p>
      </div>
    </Section>
  );
}

/** Confirm QT: a question (with a warning when the customer's PO file is missing), then the order is made and the same page shows it. */
function ConfirmQt({ qt, onDone }) {
  const { t } = useTranslation(["master", "common"]);
  const [asking, setAsking] = useState(false);
  const [noPo, setNoPo] = useState(false);
  const [error, setError] = useState(null);

  const ask = async () => {
    setError(null);
    const files = await attachmentsApi.list("QtReference", qt.id);
    setNoPo(!files.some((file) => file.kind === "PO_FILE"));
    setAsking(true);
  };

  const confirm = async () => {
    setAsking(false);
    try {
      const { order, alreadyConfirmed } = await qtApi.confirm(qt.id);
      toast.success(alreadyConfirmed ? t("master:qt.confirm.already") : t("master:qt.confirm.done"));
      onDone(order);
    } catch (failure) {
      const code = failure?.details?.[0]?.code ?? failure?.code;
      setError(failure?.details?.[0]?.path?.[0] === "lines" ? t("master:qt.confirm.noLines") : t(`master:errors.${code}`, { defaultValue: t("master:errors.UNKNOWN_ERROR") }));
    }
  };

  return (
    <>
      <Button type="button" onClick={ask}>
        <ClipboardCheck aria-hidden="true" />
        {t("master:qt.confirm.button")}
      </Button>
      {error ? (
        <Alert variant="destructive" className="w-full">
          <AlertDescription className="text-base">{error}</AlertDescription>
        </Alert>
      ) : null}
      <ConfirmDialog open={asking} onOpenChange={setAsking} title={t("master:qt.confirm.title")} text={noPo ? t("master:qt.confirm.textNoPo") : t("master:qt.confirm.text")} onConfirm={confirm} />
    </>
  );
}

/** The production order of a confirmed QT, on the same page: its processes before the start, its progress after. */
function QtProduction({ qt, onChanged }) {
  const { t } = useTranslation("master");
  const { user } = useAuth();
  const { data: order, error, reload } = useLoad(() => ordersApi.get(qt.productionOrderId), [qt.productionOrderId]);
  if (error) return <p role="alert" className="text-destructive">{t("qt.production.failed")}</p>;
  if (!order) return null;
  const changed = () => {
    reload();
    onChanged();
  };
  return (
    <section aria-labelledby="qt-production" className="flex flex-col gap-5">
      <h2 id="qt-production" className="flex flex-wrap items-center gap-x-3 text-lg font-bold">
        <Factory aria-hidden="true" className="size-5 text-primary" />
        {t("qt.production.title", { number: order.orderNumber })}
        <Link to={`/sale/orders/${order.id}`} className="text-sm font-normal">
          {t("qt.production.open")}
        </Link>
      </h2>
      {can(user, "orders.edit") && !order.started ? <OrderForm key={order.updatedAt} order={order} onChanged={changed} embedded /> : <OrderView order={order} onChanged={changed} embedded />}
    </section>
  );
}

function QtForm() {
  const { t, i18n } = useTranslation("master");
  const { data } = useLoad(() => customersApi.list({ pageSize: 200 }), []);
  const customers = [{ value: "", label: t("qt.chooseCustomer") }, ...(data?.items ?? []).map((customer) => ({ value: String(customer.id), label: customer.name }))];
  const notesId = useId();

  return (
    <RecordFormPage
      api={qtApi}
      listPath="/sale/quotations"
      newTitle={t("qt.new")}
      titleOf={(record) => record.qtNumber}
      defaults={empty()}
      afterSave={(saved) => `/sale/quotations/${saved.id}`} // a new QT opens again: the files, the print and Confirm are there
      toForm={(record) => ({
        qtNumber: record.qtNumber,
        qtDate: record.qtDate,
        customerId: String(record.customerId),
        notes: record.notes,
        customerPoNumber: record.customerPoNumber,
        customerPoDate: record.customerPoDate,
        lines: record.lines.map((line) => ({ productId: String(line.productId), quantity: line.quantity, unitPrice: line.unitPrice })),
      })}
      toBody={(values) => values}
      actions={({ record, reload }) => (record.status === "Draft" ? <ConfirmQt qt={record} onDone={reload} /> : null)}
      after={({ record, reload }) => (record.productionOrderId ? <QtProduction qt={record} onChanged={reload} /> : null)}
    >
      {({ form, record }) => {
        const errors = form.formState.errors;
        const confirmed = record?.status === "Confirmed";
        return (
          <>
            {record ? <StepChain label={t("qt.steps.label")} current={record.step} steps={STEPS.map((key) => ({ key, label: t(`qt.step.${key}`) }))} /> : null}
            {confirmed ? (
              <Alert>
                <AlertDescription className="text-base">
                  {t("qt.confirm.banner")}{" "}
                  <Link to={`/sale/orders/${record.productionOrderId}`}>{record.productionOrderNumber}</Link>
                </AlertDescription>
              </Alert>
            ) : null}

            <Section icon={FileText} title={t("qt.section")}>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label={t("qt.qtNumber")} disabled={confirmed} error={errors.qtNumber?.message} {...form.register("qtNumber")} />
                <TextField label={t("qt.qtDate")} placeholder="YYYY-MM-DD" inputMode="numeric" disabled={confirmed} error={errors.qtDate?.message} {...form.register("qtDate")} />
                <SelectField label={t("qt.customer")} options={customers} disabled={confirmed} error={errors.customerId?.message} className="sm:col-span-2" {...form.register("customerId")} />
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={notesId} className="text-sm font-semibold">
                    {t("qt.notes")}
                  </FieldLabel>
                  <Textarea id={notesId} {...form.register("notes")} />
                </Field>
              </div>
            </Section>

            <QtLines form={form} readOnly={confirmed} />

            <Section icon={UserCheck} title={t("qt.po.title")}>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label={t("qt.po.number")} error={errors.customerPoNumber?.message} {...form.register("customerPoNumber")} />
                <TextField label={t("qt.po.date")} placeholder="YYYY-MM-DD" inputMode="numeric" error={errors.customerPoDate?.message} {...form.register("customerPoDate")} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{record ? t("qt.po.hint") : t("qt.po.saveFirst")}</p>
            </Section>

            {record ? (
              <>
                <Attachments ownerType="QtReference" ownerId={record.id} kinds={["PO_FILE", "QUOTATION", "OTHER"]} canChange title={t("qt.filesTitle")} />
                <QtDocument qt={record} language={i18n.language} />
              </>
            ) : null}
          </>
        );
      }}
    </RecordFormPage>
  );
}

/** QT references (Admin and Sale Worker): the list, a new QT, one QT with its lines, its customer PO, its files, its printed form and Confirm. */
export function QtPage() {
  const { t, i18n } = useTranslation("master");
  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
            api={qtApi}
            base="/sale/quotations"
            title={t("qt.title")}
            canCreate
            newLabel={t("qt.new")}
            statusParam="step"
            statusOptions={[{ value: "", label: t("list.all") }, ...STEPS.map((value) => ({ value, label: t(`qt.step.${value}`) }))]}
            statusOf={(row) => <StatusBadge tone={STEP_TONE[row.step]}>{t(`qt.step.${row.step}`)}</StatusBadge>}
            columns={[
              { key: "qtNumber", header: t("qt.qtNumber") },
              { key: "qtDate", header: t("qt.qtDate") },
              { key: "customerName", header: t("qt.customer") },
              { key: "total", header: t("qt.lines.total"), numeric: true, cell: (row) => formatCurrency(row.total, i18n.language) },
              { key: "productionOrderNumber", header: t("qt.orderColumn"), cell: (row) => row.productionOrderNumber ?? "-" },
            ]}
          />
        }
      />
      <Route path="new" element={<QtForm />} />
      <Route path=":id" element={<QtForm />} />
    </Routes>
  );
}
