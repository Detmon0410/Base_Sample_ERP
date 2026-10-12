import { useId, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { Section, SelectField, TextField } from "@/components/common/FormFields";
import { PageHeader } from "@/components/common/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useLoad } from "@/hooks/useLoad";
import { customersApi, materialsApi, productsApi } from "@/services/master.service";
import { ordersApi } from "@/services/orders.service";
import { qtApi } from "@/services/qt.service";
import { todayIso } from "@/utils/dates";
import { formatNumber } from "@/utils/format";

import { applyServerErrors, statusKey } from "@/utils/serverErrors";

const emptyLine = () => ({ productId: "", quantity: "", unitPrice: "", processes: [] });
const empty = () => ({ qtId: "", customerId: "", orderDate: todayIso(), notes: "", lines: [emptyLine()] });

const toForm = (order) => ({
  qtId: String(order.qtId),
  customerId: String(order.customerId),
  orderDate: order.orderDate,
  notes: order.notes,
  lines: order.lines.map((line) => ({
    productId: String(line.productId),
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    processes: line.processes.map((process) => ({ name: process.name, instructions: process.instructions })),
  })),
});

/**
 * The materials of the product of a line (its BOM), for the quantity of the line. Reference only and separate from the processes:
 * it cannot be changed here (it comes from the product), and it does not look at the stock, so there is no warning when a material is short.
 */
function BomBlock({ form, index, products, materials }) {
  const { t, i18n } = useTranslation("orders");
  const productId = useWatch({ control: form.control, name: `lines.${index}.productId` });
  const quantity = Number(useWatch({ control: form.control, name: `lines.${index}.quantity` })) || 0;
  const product = products.find((item) => String(item.id) === String(productId));
  if (!product) return null;
  const name = (materialId) => {
    const material = materials.find((item) => item.id === materialId);
    return material ? `${material.code} ${material.name}` : String(materialId);
  };

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-base font-bold">{t("bom.title")}</h3>
      {product.bom.length === 0 ? (
        <p className="text-muted-foreground">{t("bom.none")}</p>
      ) : (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1 pr-4 font-semibold">{t("bom.material")}</th>
              <th className="py-1 pr-4 text-right font-semibold">{t("bom.perUnit")}</th>
              <th className="py-1 text-right font-semibold">{t("bom.needed")}</th>
            </tr>
          </thead>
          <tbody>
            {product.bom.map((line) => (
              <tr key={line.materialId} className="border-b border-border">
                <td className="py-1 pr-4">{name(line.materialId)}</td>
                <td className="py-1 pr-4 text-right">{formatNumber(line.quantity, i18n.language)}</td>
                <td className="py-1 text-right">{quantity > 0 ? formatNumber(line.quantity * quantity, i18n.language) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** One product line: the product, the quantity, the agreed unit price and the ordered list of its processes. */
function LineEditor({ form, index, products, materials, onRemove, canRemove }) {
  const { t } = useTranslation("orders");
  const processes = useFieldArray({ control: form.control, name: `lines.${index}.processes` });
  const errors = form.formState.errors.lines?.[index];
  const options = [{ value: "", label: t("lines.chooseProduct") }, ...products.map((product) => ({ value: String(product.id), label: `${product.code} ${product.name}` }))];

  return (
    <Section title={t("lines.line", { n: index + 1 })}>
      <div className="grid gap-5 sm:grid-cols-[1fr_9rem_11rem]">
        <SelectField
          label={t("lines.product")}
          options={options}
          error={errors?.productId?.message}
          {...form.register(`lines.${index}.productId`, {
            // the price of the product is the default agreed price
            onChange: (event) => {
              const product = products.find((item) => String(item.id) === event.target.value);
              if (product) form.setValue(`lines.${index}.unitPrice`, product.price);
            },
          })}
        />
        <TextField label={t("lines.quantity")} type="number" min="1" step="1" error={errors?.quantity?.message} {...form.register(`lines.${index}.quantity`)} />
        <TextField label={t("lines.unitPrice")} type="number" min="0" step="1" error={errors?.unitPrice?.message} {...form.register(`lines.${index}.unitPrice`)} />
      </div>

      <BomBlock form={form} index={index} products={products} materials={materials} />

      <h3 className="mt-6 mb-2 text-base font-bold">{t("processes.title")}</h3>
      {processes.fields.length === 0 ? <p className="mb-3 text-muted-foreground">{t("processes.none")}</p> : null}
      <ol className="flex list-none flex-col gap-4 p-0">
        {processes.fields.map((field, step) => (
          <li key={field.id} className="grid items-start gap-4 border-b border-border pb-4 sm:grid-cols-[3rem_1fr_1.5fr_auto]">
            <span className="pt-7 font-bold">
              {t("processes.step")} {step + 1}
            </span>
            <TextField label={t("processes.name")} error={errors?.processes?.[step]?.name?.message} {...form.register(`lines.${index}.processes.${step}.name`)} />
            <TextField label={t("processes.instructions")} {...form.register(`lines.${index}.processes.${step}.instructions`)} />
            <span className="flex flex-wrap gap-2 sm:mt-6">
              <Button type="button" variant="outline" size="xs" disabled={step === 0} onClick={() => processes.move(step, step - 1)}>
                {t("processes.up")}
              </Button>
              <Button type="button" variant="outline" size="xs" disabled={step === processes.fields.length - 1} onClick={() => processes.move(step, step + 1)}>
                {t("processes.down")}
              </Button>
              <Button type="button" variant="outline" size="xs" onClick={() => processes.remove(step)}>
                {t("processes.remove")}
              </Button>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => processes.append({ name: "", instructions: "" })}>
          {t("processes.add")}
        </Button>
        {canRemove ? (
          <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={onRemove}>
            {t("lines.remove")}
          </Button>
        ) : null}
      </div>
    </Section>
  );
}

/**
 * A new production order, or an existing one that has not started (Admin): the order, the product lines and, for every line,
 * the ordered processes. Save returns to the list. "Start production" (after a confirmation) locks the products and processes.
 */
export function OrderForm({ order, onChanged }) {
  const { t } = useTranslation(["orders", "master", "common"]);
  const navigate = useNavigate();
  const notesId = useId();
  const [summary, setSummary] = useState(null);
  const [asking, setAsking] = useState(false);

  const form = useForm({ defaultValues: order ? toForm(order) : empty() });
  const lines = useFieldArray({ control: form.control, name: "lines" });
  const errors = form.formState.errors;

  const qtList = useLoad(() => qtApi.list({ pageSize: 200 }), []);
  const customerList = useLoad(() => customersApi.list({ pageSize: 200 }), []);
  const productList = useLoad(() => productsApi.list({ pageSize: 200 }), []);
  const materialList = useLoad(() => materialsApi.list({ pageSize: 200 }), []);
  const qts = qtList.data?.items ?? [];
  const products = productList.data?.items ?? [];
  const materials = materialList.data?.items ?? [];

  const qtOptions = [{ value: "", label: t("orders:chooseQt") }, ...qts.map((qt) => ({ value: String(qt.id), label: `${qt.qtNumber} ${qt.customerName}` }))];
  const customerOptions = [{ value: "", label: t("orders:chooseCustomer") }, ...(customerList.data?.items ?? []).map((customer) => ({ value: String(customer.id), label: customer.name }))];

  const onSubmit = form.handleSubmit(async (values) => {
    setSummary(null);
    try {
      if (order) await ordersApi.update(order.id, values);
      else await ordersApi.create(values);
      toast.success(t("master:form.saved"));
      navigate("/sale/orders");
    } catch (error) {
      setSummary(applyServerErrors(form, error, t));
    }
  });

  const start = async () => {
    setAsking(false);
    setSummary(null);
    try {
      await ordersApi.start(order.id);
      toast.success(t("orders:start.done"));
      onChanged();
    } catch (error) {
      setSummary(applyServerErrors(form, error, t));
    }
  };

  return (
    <>
      <PageHeader title={order ? order.orderNumber : t("orders:new")} status={order ? t(`orders:status.${statusKey(order.status)}`) : null} />

      <form noValidate onSubmit={onSubmit} className="flex max-w-4xl flex-col gap-5">
        {summary ? (
          <Alert variant="destructive">
            <AlertDescription className="text-base">{summary}</AlertDescription>
          </Alert>
        ) : null}

        <Section title={t("orders:section")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label={t("orders:qt")}
              options={qtOptions}
              error={errors.qtId?.message}
              {...form.register("qtId", {
                // the customer of the QT reference is the default customer of the order
                onChange: (event) => {
                  const qt = qts.find((item) => String(item.id) === event.target.value);
                  if (qt) form.setValue("customerId", String(qt.customerId));
                },
              })}
            />
            <SelectField label={t("orders:customer")} options={customerOptions} error={errors.customerId?.message} {...form.register("customerId")} />
            <TextField label={t("orders:orderDate")} placeholder="YYYY-MM-DD" inputMode="numeric" error={errors.orderDate?.message} {...form.register("orderDate")} />
            <p className="self-end pb-2 text-sm text-muted-foreground">{order ? `${t("orders:orderNumber")}: ${order.orderNumber}` : t("orders:numberHint")}</p>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={notesId} className="text-sm font-semibold">
                {t("orders:notes")}
              </FieldLabel>
              <Textarea id={notesId} {...form.register("notes")} />
            </Field>
          </div>
        </Section>

        {lines.fields.length === 0 ? <p className="text-muted-foreground">{t("orders:lines.none")}</p> : null}
        {lines.fields.map((field, index) => (
          <LineEditor key={field.id} form={form} index={index} products={products} materials={materials} canRemove={lines.fields.length > 1} onRemove={() => lines.remove(index)} />
        ))}
        <div>
          <Button type="button" variant="outline" onClick={() => lines.append(emptyLine())}>
            {t("orders:lines.add")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t("common:actions.saving") : t("common:actions.save")}
          </Button>
          <Button asChild variant="outline">
            <Link to="/sale/orders">{t("common:actions.cancel")}</Link>
          </Button>
          {order ? (
            <span className="ml-auto flex flex-col items-end gap-1">
              <Button type="button" onClick={() => setAsking(true)}>
                {t("orders:start.button")}
              </Button>
              <span className="text-sm text-muted-foreground">{t("orders:start.hint")}</span>
            </span>
          ) : null}
        </div>
      </form>

      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("orders:start.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("orders:start.text")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={start}>{t("common:actions.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
