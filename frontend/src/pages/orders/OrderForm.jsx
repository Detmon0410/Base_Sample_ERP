import { ClipboardList, Layers, ListOrdered, Package, Plus, Save, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { Section, SelectField, TextField } from "@/components/common/FormFields";
import { PageHeader } from "@/components/common/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { materialsApi, productsApi } from "@/services/master.service";
import { ordersApi } from "@/services/orders.service";
import { can } from "@/utils/permissions";
import { formatCurrency, formatNumber } from "@/utils/format";

import { applyServerErrors, statusKey } from "@/utils/serverErrors";

import { useStartProduction } from "./StartProduction";

const emptyLine = () => ({ productId: "", quantity: "", unitPrice: "", processes: [] });

const toForm = (order) => ({
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
      <h3 className="mb-2 flex items-center gap-2 text-base font-bold">
        <Layers aria-hidden="true" className="size-4 text-primary" />
        {t("bom.title")}
      </h3>
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

/**
 * One product line: the product, the quantity, the agreed unit price and the ordered list of its processes. A line that comes from the QT
 * (`locked`) shows its product, quantity and price as text; only a line added here is typed in.
 */
function LineEditor({ form, index, products, materials, onRemove, canRemove, locked }) {
  const { t, i18n } = useTranslation("orders");
  const [productId, quantity, unitPrice] = useWatch({ control: form.control, name: [`lines.${index}.productId`, `lines.${index}.quantity`, `lines.${index}.unitPrice`] });
  const product = products.find((item) => String(item.id) === String(productId));
  const processes = useFieldArray({ control: form.control, name: `lines.${index}.processes` });
  const errors = form.formState.errors.lines?.[index];
  const options = [{ value: "", label: t("lines.chooseProduct") }, ...products.map((product) => ({ value: String(product.id), label: `${product.code} ${product.name}` }))];

  return (
    <Section icon={Package} title={t("lines.line", { n: index + 1 })}>
      {locked ? (
        <div className="grid gap-5 sm:grid-cols-[1fr_9rem_11rem]">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{t("lines.product")}</p>
            <p>{product ? `${product.code} ${product.name}` : "-"}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{t("lines.quantity")}</p>
            <p>{formatNumber(Number(quantity) || 0, i18n.language)}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{t("lines.unitPrice")}</p>
            <p>{formatCurrency(Number(unitPrice) || 0, i18n.language)}</p>
          </div>
        </div>
      ) : (
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
          <TextField label={t("lines.quantity")} placeholder={t("examples:quantity")} type="number" min="1" step="1" error={errors?.quantity?.message} {...form.register(`lines.${index}.quantity`)} />
          <TextField label={t("lines.unitPrice")} placeholder={t("examples:unitPrice")} type="number" min="0" step="1" error={errors?.unitPrice?.message} {...form.register(`lines.${index}.unitPrice`)} />
        </div>
      )}

      <BomBlock form={form} index={index} products={products} materials={materials} />

      <h3 className="mt-6 mb-2 flex items-center gap-2 text-base font-bold">
        <ListOrdered aria-hidden="true" className="size-4 text-primary" />
        {t("processes.title")}
      </h3>
      {processes.fields.length === 0 ? <p className="mb-3 text-muted-foreground">{t("processes.none")}</p> : null}
      <ol className="flex list-none flex-col gap-4 p-0">
        {processes.fields.map((field, step) => (
          <li key={field.id} className="grid items-start gap-4 border-b border-border pb-4 sm:grid-cols-[3rem_1fr_1.5fr_auto]">
            <span className="pt-7 font-bold">
              {t("processes.step")} {step + 1}
            </span>
            <TextField label={t("processes.name")} error={errors?.processes?.[step]?.name?.message} {...form.register(`lines.${index}.processes.${step}.name`)} />
            <TextField label={t("processes.instructions")} {...form.register(`lines.${index}.processes.${step}.instructions`)} />
            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive sm:mt-5" aria-label={t("processes.remove")} title={t("processes.remove")} onClick={() => processes.remove(step)}>
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => processes.append({ name: "", instructions: "" })}>
          <Plus aria-hidden="true" />
          {t("processes.add")}
        </Button>
        {canRemove ? (
          <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={onRemove}>
            <Trash2 aria-hidden="true" />
            {t("lines.remove")}
          </Button>
        ) : null}
      </div>
    </Section>
  );
}

/**
 * An order that has not started (Admin and Sale Worker): the order, the product lines and, for every line, the ordered processes.
 * The order was made by Confirm QT, so its QT and its customer are shown and cannot change. Save returns to the list. "Start production"
 * (Admin and Factory Worker, after a confirmation) locks the products and processes.
 * `embedded` is the part of the QT page: no title band and no order box (the QT page shows them), Save stays on the page.
 */
export function OrderForm({ order, onChanged, embedded = false }) {
  const { t } = useTranslation(["orders", "master", "common"]);
  const navigate = useNavigate();
  const notesId = useId();
  const [summary, setSummary] = useState(null);

  const form = useForm({ defaultValues: toForm(order) });
  const lines = useFieldArray({ control: form.control, name: "lines" });
  const errors = form.formState.errors;
  const [savedLines] = useState(() => new Set(lines.fields.map((field) => field.id))); // the lines of the QT are not typed in

  const productList = useLoad(() => productsApi.list({ pageSize: 200 }), []);
  const materialList = useLoad(() => materialsApi.list({ pageSize: 200 }), []);
  const products = productList.data?.items ?? [];
  const materials = materialList.data?.items ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    setSummary(null);
    try {
      await ordersApi.update(order.id, values);
      toast.success(t("master:form.saved"));
      if (embedded) onChanged();
      else navigate("/sale/orders");
    } catch (error) {
      setSummary(applyServerErrors(form, error, t));
    }
  });

  const starter = useStartProduction(order, onChanged); // used by whoever may start (docs/api, Who may call)
  const { user } = useAuth();

  return (
    <>
      {embedded ? null : <PageHeader title={order.orderNumber} status={t(`orders:status.${statusKey(order.status)}`)} statusTone={{ Draft: "neutral", InProgress: "progress", Completed: "good" }[statusKey(order.status)]} />}

      <form noValidate onSubmit={onSubmit} className="flex max-w-4xl flex-col gap-5">
        {summary ? (
          <Alert variant="destructive">
            <AlertDescription className="text-base">{summary}</AlertDescription>
          </Alert>
        ) : null}
        {starter.alert}

        {embedded ? null : <Section icon={ClipboardList} title={t("orders:section")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">{t("orders:qt")}</p>
              <p>{can(user, "qt.use") ? <Link to={`/sale/quotations/${order.qtId}`}>{order.qtNumber}</Link> : order.qtNumber}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">{t("orders:customer")}</p>
              <p>{order.customerName}</p>
            </div>
            <TextField label={t("orders:orderDate")} placeholder={t("examples:date")} inputMode="numeric" error={errors.orderDate?.message} {...form.register("orderDate")} />
            <div>
              <p className="text-sm font-semibold text-muted-foreground">{t("orders:customerPo")}</p>
              <p>{order.customerPoNumber || "-"}</p>
            </div>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={notesId} className="text-sm font-semibold">
                {t("orders:notes")}
              </FieldLabel>
              <Textarea id={notesId} placeholder={t("examples:notes")} {...form.register("notes")} />
            </Field>
          </div>
        </Section>}

        {lines.fields.length === 0 ? <p className="text-muted-foreground">{t("orders:lines.none")}</p> : null}
        {productList.data && materialList.data ? lines.fields.map((field, index) => (
          <LineEditor key={field.id} locked={savedLines.has(field.id)} form={form} index={index} products={products} materials={materials} canRemove={lines.fields.length > 1} onRemove={() => lines.remove(index)} />
        )) : <p role="status">{t("common:loading")}</p>} {/* the products are the options of the selects: wait for them */}
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => lines.append(emptyLine())}>
            <Plus aria-hidden="true" />
            {t("orders:lines.add")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <Save aria-hidden="true" />{form.formState.isSubmitting ? t("common:actions.saving") : t("common:actions.save")}
          </Button>
          {embedded ? null : (
            <Button asChild variant="outline">
              <Link to="/sale/orders"><X aria-hidden="true" />{t("common:actions.cancel")}</Link>
            </Button>
          )}
          {can(user, "orders.start") ? (
            <span className="ml-auto flex flex-col items-end gap-1">
              {starter.button}
              <span className="text-sm text-muted-foreground">{t("orders:start.hint")}</span>
            </span>
          ) : null}
        </div>
      </form>

      {starter.dialog}
    </>
  );
}
