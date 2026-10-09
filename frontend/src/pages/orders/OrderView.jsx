import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";

import { NativeSelect, Section, TextField } from "@/components/common/FormFields";
import { PageHeader } from "@/components/common/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { ordersApi } from "@/services/orders.service";
import { todayIso } from "@/utils/dates";
import { formatCurrency, formatDateTime, formatNumber } from "@/utils/format";
import { isAdmin } from "@/utils/permissions";

import { applyServerErrors, statusKey } from "@/utils/serverErrors";

const PROCESS_STATUSES = ["Not Started", "In Progress", "Completed"];

/** The form to record one progress update of a process (an entry of the history). */
function ProgressForm({ order, line, process, onDone, onCancel }) {
  const { t } = useTranslation(["orders", "master", "common"]);
  const [summary, setSummary] = useState(null);
  const completed = process.status === "Completed";
  const form = useForm({
    defaultValues: { status: completed ? "In Progress" : process.status, completedQuantity: process.completedQuantity, workDate: todayIso(), note: "" },
  });
  const errors = form.formState.errors;
  const noteId = useId();

  const onSubmit = form.handleSubmit(async (values) => {
    setSummary(null);
    try {
      await ordersApi.recordProgress(order.id, { processId: process.id, ...values });
      toast.success(t("orders:progress.saved"));
      onDone();
    } catch (error) {
      setSummary(applyServerErrors(form, error, t));
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="mt-4 flex flex-col gap-4 border border-border bg-page p-4">
      <h3 className="text-base font-bold">{t("orders:progress.title", { name: `${line.productCode} / ${process.sequence}. ${process.name}` })}</h3>
      {completed ? <p className="text-muted-foreground">{t("orders:progress.reopenHint")}</p> : null}
      {summary ? (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{summary}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-3">
        <Field data-invalid={errors.status ? true : undefined}>
          <FieldLabel className="text-sm font-semibold">{t("orders:progress.status")}</FieldLabel>
          <NativeSelect
            aria-label={t("orders:progress.status")}
            aria-invalid={errors.status ? true : undefined}
            options={PROCESS_STATUSES.map((value) => ({ value, label: t(`orders:processStatus.${statusKey(value)}`) }))}
            {...form.register("status")}
          />
          {errors.status ? <FieldError>{errors.status.message}</FieldError> : null}
        </Field>
        <TextField label={t("orders:progress.completedQuantity")} type="number" min="0" step="1" error={errors.completedQuantity?.message} {...form.register("completedQuantity")} />
        <TextField label={t("orders:progress.workDate")} placeholder="YYYY-MM-DD" inputMode="numeric" error={errors.workDate?.message} {...form.register("workDate")} />
        <Field data-invalid={errors.note ? true : undefined} className="sm:col-span-3">
          <FieldLabel htmlFor={noteId} className="text-sm font-semibold">
            {t("orders:progress.note")}
          </FieldLabel>
          <input
            id={noteId}
            className="h-10 w-full border-0 border-b border-input bg-transparent px-1 text-base outline-none focus-visible:border-b-2 focus-visible:border-primary aria-invalid:border-destructive"
            aria-invalid={errors.note ? true : undefined}
            {...form.register("note")}
          />
          {errors.note ? <FieldError>{errors.note.message}</FieldError> : null}
        </Field>
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t("common:actions.saving") : t("orders:progress.save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common:actions.cancel")}
        </Button>
      </div>
    </form>
  );
}

/**
 * An order that has started (or any order, for a Worker): the order, its products with their processes and the progress of each,
 * and the history of every update. A Worker records progress; a completed process can be reopened only by an Admin.
 */
export function OrderView({ order, onChanged }) {
  const { t, i18n } = useTranslation(["orders", "master", "common"]);
  const { user } = useAuth();
  const admin = isAdmin(user);
  const [editing, setEditing] = useState(null); // the id of the process whose progress is being recorded
  const language = i18n.language;

  const done = () => {
    setEditing(null);
    onChanged();
  };

  return (
    <>
      <PageHeader title={order.orderNumber} status={t(`orders:status.${statusKey(order.status)}`)} />

      <div className="flex max-w-5xl flex-col gap-5">
        <Section title={t("orders:section")}>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {[
              [t("orders:qt"), admin ? <Link key="qt" to={`/qt/${order.qtId}`}>{order.qtNumber}</Link> : order.qtNumber],
              [t("orders:customer"), order.customerName],
              [t("orders:orderDate"), order.orderDate],
              [t("orders:startedAt"), order.started ? formatDateTime(order.startedAt, language) : t("orders:notStarted")],
              [t("orders:invoice"), order.invoice ? <Link key="invoice" to={`/invoices/${order.invoice.id}`}>{order.invoice.invoiceNumber}</Link> : null],
              [t("orders:receipt"), order.invoice?.receiptNumber ? <Link key="receipt" to={`/invoices/${order.invoice.id}`}>{order.invoice.receiptNumber}</Link> : null],
              [t("orders:notes"), order.notes],
            ].map(([label, value], index) => (
              <div key={index}>
                <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
                <dd>{value || "-"}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {order.lines.map((line, index) => (
          <Section key={line.id} title={`${t("orders:lines.line", { n: index + 1 })}: ${line.productCode} ${line.productName}`}>
            <p className="mb-3">
              {t("orders:lines.quantity")}: {formatNumber(line.quantity, language)} / {t("orders:lines.unitPrice")}: {formatCurrency(line.unitPrice, language)}
            </p>
            <Table data-stack>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orders:processes.step")}</TableHead>
                  <TableHead>{t("orders:processes.name")}</TableHead>
                  <TableHead>{t("orders:processes.instructions")}</TableHead>
                  <TableHead>{t("orders:processes.required")}</TableHead>
                  <TableHead>{t("orders:processes.completed")}</TableHead>
                  <TableHead>{t("orders:processes.status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {line.processes.map((process) => {
                  const canRecord = order.started && (process.status !== "Completed" || admin);
                  return (
                    <TableRow key={process.id}>
                      <TableCell data-label={t("orders:processes.step")}>{process.sequence}</TableCell>
                      <TableCell data-label={t("orders:processes.name")}>
                        {process.name}
                        {order.started && process.id === line.processes.find((item) => item.status !== "Completed")?.id ? <span className="ml-2 border border-foreground px-1 text-sm">{t("orders:processes.current")}</span> : null}
                      </TableCell>
                      <TableCell data-label={t("orders:processes.instructions")} className="whitespace-normal">
                        {process.instructions}
                      </TableCell>
                      <TableCell data-label={t("orders:processes.required")}>{formatNumber(line.quantity, language)}</TableCell>
                      <TableCell data-label={t("orders:processes.completed")}>{formatNumber(process.completedQuantity, language)}</TableCell>
                      <TableCell data-label={t("orders:processes.status")}>{t(`orders:processStatus.${statusKey(process.status)}`)}</TableCell>
                      <TableCell>
                        {canRecord ? (
                          <Button type="button" variant="outline" size="xs" onClick={() => setEditing(process.id)}>
                            {process.status === "Completed" ? t("orders:progress.reopen") : t("orders:progress.record")}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {line.processes.some((process) => process.id === editing) ? (
              <ProgressForm key={editing} order={order} line={line} process={line.processes.find((process) => process.id === editing)} onDone={done} onCancel={() => setEditing(null)} />
            ) : null}
          </Section>
        ))}

        <Section title={t("orders:progress.history")}>
          {order.history.length === 0 ? (
            <p className="text-muted-foreground">{t("orders:progress.noHistory")}</p>
          ) : (
            <Table data-stack>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orders:progress.when")}</TableHead>
                  <TableHead>{t("orders:progress.process")}</TableHead>
                  <TableHead>{t("orders:processes.status")}</TableHead>
                  <TableHead>{t("orders:processes.completed")}</TableHead>
                  <TableHead>{t("orders:progress.workDate")}</TableHead>
                  <TableHead>{t("orders:progress.note")}</TableHead>
                  <TableHead>{t("orders:progress.by")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell data-label={t("orders:progress.when")}>{formatDateTime(entry.at, language)}</TableCell>
                    <TableCell data-label={t("orders:progress.process")}>{entry.processName}</TableCell>
                    <TableCell data-label={t("orders:processes.status")}>{t(`orders:processStatus.${statusKey(entry.status)}`)}</TableCell>
                    <TableCell data-label={t("orders:processes.completed")}>{formatNumber(entry.completedQuantity, language)}</TableCell>
                    <TableCell data-label={t("orders:progress.workDate")}>{entry.workDate}</TableCell>
                    <TableCell data-label={t("orders:progress.note")} className="whitespace-normal">
                      {entry.note}
                    </TableCell>
                    <TableCell data-label={t("orders:progress.by")}>{entry.userName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        <div>
          <Button asChild variant="outline">
            <Link to="/orders">{t("master:form.back")}</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
