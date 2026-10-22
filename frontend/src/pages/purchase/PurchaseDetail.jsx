import { ArrowLeft, Banknote, Boxes, ClipboardList, CreditCard, Ellipsis, FileSignature, Landmark, PackageCheck, Pencil, Send, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { Attachments } from "@/components/common/Attachments";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Section, TextField } from "@/components/common/FormFields";
import { IconSelect } from "@/components/common/IconSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLoad } from "@/hooks/useLoad";
import { purchaseApi } from "@/services/purchase.service";
import { todayIso } from "@/utils/dates";
import { formatCurrency, formatDateTime, formatNumber } from "@/utils/format";
import { applyServerErrors } from "@/utils/serverErrors";

import { PurchaseDocument } from "./PurchaseDocument";

const METHODS = ["Cash", "Bank transfer", "Cheque", "Credit card", "Other"];
const METHOD_ICONS = { Cash: Banknote, "Bank transfer": Landmark, Cheque: FileSignature, "Credit card": CreditCard, Other: Ellipsis };
const methodKey = (method) => method.replace(/ (.)/g, (_, letter) => letter.toUpperCase()).replace(/^./, (letter) => letter.toUpperCase());
const NO_FORM = { setError: () => {} };
const STATUS_TONE = { Draft: "neutral", Sent: "progress", Received: "good" };

/** Receive the goods: the lot number of each line (it starts as LOT-yyyymmdd), then the quantities are added to the stock, once. */
function ReceivePanel({ po, onDone, onCancel }) {
  const { t } = useTranslation("purchase");
  const stamp = `LOT-${todayIso().replaceAll("-", "")}`;
  const [lots, setLots] = useState(() => Object.fromEntries(po.lines.map((line) => [line.id, stamp])));
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const submit = async () => {
    setError(null);
    setFieldErrors({});
    try {
      await purchaseApi.setStatus(po.id, { status: "Received", lots: po.lines.map((line) => ({ lineId: line.id, lotNumber: lots[line.id] })) });
      toast.success(t("receive.done"));
      onDone();
    } catch (failure) {
      const next = {};
      for (const detail of failure?.details ?? []) {
        const index = Number(detail.path?.[1]);
        if (Number.isInteger(index) && po.lines[index]) next[po.lines[index].id] = true;
      }
      setFieldErrors(next);
      setError(applyServerErrors(NO_FORM, failure, t));
    }
  };

  return (
    <Section icon={PackageCheck} title={t("receive.title")}>
      <p className="mb-4 text-sm text-muted-foreground">{t("receive.hint")}</p>
      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="text-base">{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-4">
        {po.lines.map((line) => (
          <div key={line.id} className="grid items-start gap-4 sm:grid-cols-[1fr_14rem]">
            <p className="pt-2">
              {line.materialCode} {line.materialName}: {formatNumber(line.quantity)} {line.unit}
            </p>
            <Field data-invalid={fieldErrors[line.id] ? true : undefined}>
              <FieldLabel className="text-sm font-semibold">{t("receive.lot")}</FieldLabel>
              <input
                aria-label={`${t("receive.lot")}: ${line.materialCode}`}
                value={lots[line.id]}
                onChange={(event) => setLots((current) => ({ ...current, [line.id]: event.target.value }))}
                className="border-0 border-b border-input bg-transparent px-1 py-2 text-base outline-none focus:border-ring"
              />
              {fieldErrors[line.id] ? <FieldError>{t("master:errors.REQUIRED")}</FieldError> : null}
            </Field>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" onClick={submit}>
          <PackageCheck aria-hidden="true" />
          {t("receive.confirm")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X aria-hidden="true" />
          {t("receive.cancel")}
        </Button>
      </div>
    </Section>
  );
}

/** The one payment of a received PO: date, amount (the total), method, reference no. and note. */
function PaymentSection({ po, onDone }) {
  const { t, i18n } = useTranslation(["purchase", "master"]);
  const language = i18n.language;
  const form = useForm({ defaultValues: { paymentDate: todayIso(), amount: po.total, method: "", referenceNo: `PAY-${po.poNumber}`, note: "" } });
  const errors = form.formState.errors;
  const [asking, setAsking] = useState(false);
  const [summary, setSummary] = useState(null);

  const save = form.handleSubmit(() => setAsking(true));
  const record = async () => {
    setAsking(false);
    setSummary(null);
    try {
      await purchaseApi.pay(po.id, form.getValues());
      toast.success(t("purchase:payment.done"));
      onDone();
    } catch (failure) {
      setSummary(applyServerErrors(form, failure, t));
    }
  };

  return (
    <Section icon={Banknote} title={t("purchase:payment.title")}>
      {po.payment ? (
        <p>
          {t("purchase:payment.paidOn", { date: po.payment.paymentDate, amount: formatCurrency(po.payment.amount, language), method: t(`purchase:payment.methods.${methodKey(po.payment.method)}`) })}
          {po.payment.referenceNo ? ` - ${po.payment.referenceNo}` : ""}
          {po.payment.note ? ` (${po.payment.note})` : ""}
        </p>
      ) : po.status !== "Received" ? (
        <p className="text-muted-foreground">{t("purchase:payment.none")}</p>
      ) : (
        <form noValidate onSubmit={save} className="flex flex-col gap-5">
          {summary ? (
            <Alert variant="destructive">
              <AlertDescription className="text-base">{summary}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label={t("purchase:payment.date")} placeholder={t("examples:date")} inputMode="numeric" error={errors.paymentDate?.message} {...form.register("paymentDate")} />
            <TextField label={t("purchase:payment.amount")} type="number" min="0" step="1" error={errors.amount?.message} {...form.register("amount")} />
            <Field data-invalid={errors.method ? true : undefined}>
              <FieldLabel className="text-sm font-semibold">{t("purchase:payment.method")}</FieldLabel>
              <Controller
                control={form.control}
                name="method"
                render={({ field }) => (
                  <IconSelect
                    aria-label={t("purchase:payment.method")}
                    invalid={Boolean(errors.method)}
                    placeholder={t("purchase:payment.chooseMethod")}
                    options={METHODS.map((value) => ({ value, icon: METHOD_ICONS[value], label: t(`purchase:payment.methods.${methodKey(value)}`) }))}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.method ? <FieldError>{errors.method.message}</FieldError> : null}
            </Field>
            <TextField label={t("purchase:payment.reference")} error={errors.referenceNo?.message} {...form.register("referenceNo")} />
            <TextField label={t("purchase:payment.note")} placeholder={t("examples:paymentNote")} className="sm:col-span-2" error={errors.note?.message} {...form.register("note")} />
            <p className="text-sm text-muted-foreground sm:col-span-2">{t("purchase:payment.hint", { total: formatCurrency(po.total, language) })}</p>
          </div>
          <div>
            <Button type="submit">
              <Banknote aria-hidden="true" />
              {t("purchase:payment.record")}
            </Button>
          </div>
        </form>
      )}
      <ConfirmDialog open={asking} onOpenChange={setAsking} title={t("purchase:payment.confirmTitle")} text={t("purchase:payment.confirmText")} onConfirm={record} />
    </Section>
  );
}

/** One PO: its lines, the status buttons, the payment, the files and the printed form. */
export function PurchaseDetail({ id }) {
  const { t, i18n } = useTranslation(["purchase", "master", "common"]);
  const language = i18n.language;
  const navigate = useNavigate();
  const { data: po, error, loading, reload } = useLoad(() => purchaseApi.get(id), [id]);
  const [receiving, setReceiving] = useState(false);
  const [askSent, setAskSent] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [message, setMessage] = useState(null);

  if (error) return <PageHeader title={t("master:form.notFound")} />;
  if (loading || !po) return <PageHeader title={t("common:loading")} />;

  const fail = (failure) => setMessage(applyServerErrors(NO_FORM, failure, t));
  const markSent = async () => {
    setAskSent(false);
    setMessage(null);
    try {
      await purchaseApi.setStatus(po.id, { status: "Sent" });
      toast.success(t("actions.sentDone"));
      reload();
    } catch (failure) {
      fail(failure);
    }
  };
  const remove = async () => {
    setAskDelete(false);
    setMessage(null);
    try {
      await purchaseApi.remove(po.id);
      toast.success(t("detail.deleted"));
      navigate("/purchase/orders");
    } catch (failure) {
      fail(failure);
    }
  };
  const done = () => {
    setReceiving(false);
    reload();
  };

  return (
    <>
      <PageHeader title={po.poNumber} status={t(`status.${po.status}`)} statusTone={STATUS_TONE[po.status]} />

      <div className="flex max-w-5xl flex-col gap-5">
        {message ? (
          <Alert variant="destructive">
            <AlertDescription className="text-base">{message}</AlertDescription>
          </Alert>
        ) : null}

        <PurchaseDocument po={po} language={language} />

        <div className="flex flex-wrap items-center gap-3">
          {po.status === "Draft" ? (
            <>
              <Button asChild variant="outline">
                <Link to={`/purchase/orders/${po.id}/edit`}>
                  <Pencil aria-hidden="true" />
                  {t("edit")}
                </Link>
              </Button>
              <Button type="button" onClick={() => setAskSent(true)}>
                <Send aria-hidden="true" />
                {t("actions.markSent")}
              </Button>
            </>
          ) : null}
          {po.status === "Sent" && !receiving ? (
            <Button type="button" onClick={() => setReceiving(true)}>
              <PackageCheck aria-hidden="true" />
              {t("actions.markReceived")}
            </Button>
          ) : null}
          {po.status === "Draft" ? (
            <Button type="button" variant="destructive" className="ml-auto" onClick={() => setAskDelete(true)}>
              <Trash2 aria-hidden="true" />
              {t("detail.delete")}
            </Button>
          ) : null}
        </div>
        {po.status === "Draft" ? <p className="-mt-3 text-sm text-muted-foreground">{t("detail.editHint")}</p> : null}

        {receiving ? <ReceivePanel po={po} onDone={done} onCancel={() => setReceiving(false)} /> : null}

        <Section icon={ClipboardList} title={t("detail.section")}>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {[
              [t("supplier"), po.supplierName],
              [t("requiredShort"), po.requiredDate],
              [t("department"), t(`master:users.departments.${po.department}`, po.department)],
              [t("status"), <StatusBadge key="status" tone={STATUS_TONE[po.status]}>{t(`status.${po.status}`)}</StatusBadge>],
              [t("paid"), <StatusBadge key="paid" tone={po.paid ? "good" : "warn"}>{po.paid ? t("paidYes") : t("paidNo")}</StatusBadge>],
              [t("detail.by"), po.createdByName],
              [t("detail.received"), po.receivedAt ? formatDateTime(po.receivedAt, language) : null],
              [t("notes"), po.notes],
            ].map(([label, value], index) => (
              <div key={index}>
                <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
                <dd>{value || "-"}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section icon={Boxes} title={t("lines.title")}>
          <Table data-stack>
            <TableHeader>
              <TableRow>
                <TableHead>{t("lines.material")}</TableHead>
                <TableHead className="text-right">{t("lines.quantity")}</TableHead>
                <TableHead>{t("lines.unit")}</TableHead>
                <TableHead className="text-right">{t("lines.unitPrice")}</TableHead>
                <TableHead className="text-right">{t("lines.amount")}</TableHead>
                <TableHead>{t("lines.lot")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell data-label={t("lines.material")}>
                    {line.materialCode} {line.materialName}
                  </TableCell>
                  <TableCell data-label={t("lines.quantity")} className="text-right">
                    {formatNumber(line.quantity, language)}
                  </TableCell>
                  <TableCell data-label={t("lines.unit")}>{line.unit}</TableCell>
                  <TableCell data-label={t("lines.unitPrice")} className="text-right">
                    {formatCurrency(line.unitPrice, language)}
                  </TableCell>
                  <TableCell data-label={t("lines.amount")} className="text-right">
                    {formatCurrency(line.amount, language)}
                  </TableCell>
                  <TableCell data-label={t("lines.lot")}>{line.lotNumber ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-right text-lg font-bold">
            {t("lines.total")}: {formatCurrency(po.total, language)}
          </p>
        </Section>

        <PaymentSection po={po} onDone={reload} />

        <Attachments ownerType="PurchaseOrder" ownerId={po.id} kinds={["PO_FILE", "QUOTATION", "OTHER"]} canChange title={t("filesTitle")} />

        <div>
          <Button asChild variant="outline">
            <Link to="/purchase/orders">
              <ArrowLeft aria-hidden="true" />
              {t("detail.back")}
            </Link>
          </Button>
        </div>
      </div>

      <ConfirmDialog open={askSent} onOpenChange={setAskSent} title={t("actions.sentTitle")} text={t("actions.sentText")} onConfirm={markSent} />
      <ConfirmDialog open={askDelete} onOpenChange={setAskDelete} title={t("detail.deleteTitle")} text={t("detail.deleteText", { name: po.poNumber })} onConfirm={remove} />
    </>
  );
}
