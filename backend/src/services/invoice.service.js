import { prisma } from "../lib/prisma.js";
import { ApiError, Issues, conflict, notFound } from "../lib/errors.js";
import { containsFilter, iso, isInt, meta, nextNumber, paging, parseDate, str, ymd } from "../lib/util.js";
import { orderStatus } from "./order.service.js";

const include = { order: true, lines: { orderBy: { id: "asc" } }, payment: true, receipt: { include: { invoice: true } } };

export const receiptView = (r) => ({
  id: r.id,
  invoiceId: r.invoiceId,
  receiptNumber: r.receiptNumber,
  receiptDate: ymd(r.receiptDate),
  customerName: r.customerName,
  customerAddress: r.customerAddress,
  invoiceNumber: r.invoice.invoiceNumber,
  amount: r.amount
});

function view(i, { withLines = true } = {}) {
  const out = {
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    invoiceDate: ymd(i.invoiceDate),
    orderId: i.orderId,
    orderNumber: i.order.orderNumber,
    customerName: i.customerName,
    customerAddress: i.customerAddress,
    total: i.total,
    status: i.status,
    payment: i.payment ? { date: ymd(i.payment.paymentDate), amount: i.payment.amount } : null,
    receipt: i.receipt ? receiptView(i.receipt) : null,
    createdAt: iso(i.createdAt)
  };
  return withLines
    ? { ...out, lines: i.lines.map((l) => ({ productCode: l.productCode, productName: l.productName, quantity: l.quantity, unitPrice: l.unitPrice, amount: l.amount })) }
    : out;
}

export async function list(query) {
  const p = paging(query);
  const q = str(query.q);
  const status = str(query.status);
  if (status && !["Unpaid", "Paid"].includes(status)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation failed", [{ path: ["status"], code: "INVALID" }]);
  }
  const where = {};
  if (status) where.status = status;
  if (q) where.OR = [...containsFilter(["invoiceNumber", "customerName"], q).OR, { order: { orderNumber: { contains: q } } }];
  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({ where, include, orderBy: { id: "desc" }, skip: p.skip, take: p.take }),
    prisma.invoice.count({ where })
  ]);
  return { data: rows.map((r) => view(r, { withLines: false })), ...meta(p, total) };
}

export async function get(id) {
  const i = await prisma.invoice.findUnique({ where: { id }, include });
  if (!i) throw notFound("Invoice not found");
  return view(i);
}

export async function create(body) {
  const issues = new Issues();
  if (!isInt(body.orderId)) issues.add("orderId", "REQUIRED");
  const invoiceDate = body.invoiceDate ? parseDate(body.invoiceDate) : null;
  if (!body.invoiceDate) issues.add("invoiceDate", "REQUIRED");
  else if (!invoiceDate) issues.add("invoiceDate", "INVALID_DATE");
  issues.throwIfAny();

  const order = await prisma.productionOrder.findUnique({
    where: { id: body.orderId },
    include: { customer: true, invoice: true, lines: { include: { product: true, processes: true } } }
  });
  if (!order) throw notFound("Order not found");
  if (orderStatus(order) !== "Completed") throw conflict("ORDER_NOT_COMPLETED", "The order is not completed");
  if (order.invoice) throw conflict("INVOICE_EXISTS", "The order has an invoice already");

  // A snapshot: later changes of the customer or the products do not change it
  const lines = order.lines.map((l) => ({
    productCode: l.product.code,
    productName: l.product.name,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    amount: l.quantity * l.unitPrice
  }));
  const invoice = await prisma.$transaction(async (tx) =>
    tx.invoice.create({
      data: {
        invoiceNumber: await nextNumber(tx, "invoice", "invoiceNumber", "INV"),
        invoiceDate,
        orderId: order.id,
        customerName: order.customer.name,
        customerAddress: order.customer.address,
        total: lines.reduce((s, l) => s + l.amount, 0),
        lines: { create: lines }
      },
      include
    })
  );
  return view(invoice);
}

export async function pay(id, body) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include });
  if (!invoice) throw notFound("Invoice not found");

  const issues = new Issues();
  const paymentDate = body.paymentDate ? parseDate(body.paymentDate) : null;
  if (!body.paymentDate) issues.add("paymentDate", "REQUIRED");
  else if (!paymentDate) issues.add("paymentDate", "INVALID_DATE");
  if (body.amount === undefined || body.amount === null || body.amount === "") issues.add("amount", "REQUIRED");
  else if (!isInt(body.amount)) issues.add("amount", "INVALID");
  else if (body.amount !== invoice.total) issues.add("amount", "MUST_EQUAL_TOTAL");
  issues.throwIfAny();

  if (invoice.status === "Paid") throw conflict("ALREADY_PAID", "The invoice is paid already");

  await prisma.$transaction(async (tx) => {
    const marked = await tx.invoice.updateMany({ where: { id, status: "Unpaid" }, data: { status: "Paid" } });
    if (marked.count === 0) throw conflict("ALREADY_PAID", "The invoice is paid already");
    await tx.payment.create({ data: { invoiceId: id, paymentDate, amount: invoice.total } });
    await tx.receipt.create({
      data: {
        receiptNumber: await nextNumber(tx, "receipt", "receiptNumber", "RC"),
        invoiceId: id,
        receiptDate: paymentDate,
        customerName: invoice.customerName,
        customerAddress: invoice.customerAddress,
        amount: invoice.total
      }
    });
  });
  return get(id);
}

export async function listReceipts(query) {
  const p = paging(query);
  const q = str(query.q);
  const where = q ? { OR: [...containsFilter(["receiptNumber", "customerName"], q).OR, { invoice: { invoiceNumber: { contains: q } } }] } : {};
  const [rows, total] = await Promise.all([
    prisma.receipt.findMany({ where, include: { invoice: true }, orderBy: { id: "desc" }, skip: p.skip, take: p.take }),
    prisma.receipt.count({ where })
  ]);
  return { data: rows.map(receiptView), ...meta(p, total) };
}

export async function getReceipt(id) {
  const r = await prisma.receipt.findUnique({ where: { id }, include: { invoice: true } });
  if (!r) throw notFound("Receipt not found");
  return receiptView(r);
}
