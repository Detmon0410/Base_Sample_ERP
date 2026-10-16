// Orders for the tests. An order is made the way the system makes it: a QT with the lines, Confirm QT (the order is made from the lines),
// then the processes, the date and the notes on the order. `body` is { customerId, orderDate, notes, lines: [{ productId, quantity, unitPrice,
// processes }] } (a `qtId` in it is ignored: the helper makes its own QT).

import { qtApi } from "@/services/qt.service";
import { ordersApi } from "@/services/orders.service";
import { productsApi } from "@/services/master.service";

let made = 0;
const nextQtNumber = () => `QT-T${(made += 1)}`;
const today = () => new Date().toISOString().slice(0, 10);

/** The order of the body, through the services (the token of the Admin is set). Returns the order. */
export async function makeOrder(body) {
  const lines = body.lines ?? [];
  const placeholder = lines.length ? null : (await productsApi.list({ pageSize: 1 })).items[0]; // an order without lines starts from a QT with one line
  const qtLines = lines.length ? lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice })) : [{ productId: placeholder.id, quantity: 1, unitPrice: 1 }];
  const qt = await qtApi.create({ qtNumber: nextQtNumber(), qtDate: body.orderDate ?? today(), customerId: body.customerId, lines: qtLines });
  const { order } = await qtApi.confirm(qt.id);
  return ordersApi.update(order.id, { orderDate: body.orderDate ?? order.orderDate, notes: body.notes ?? "", lines });
}

/** The same through the routes of the mock: `call(route, who, { body, params })`. Returns `{ data: order }` like the answer of a create. */
export function makeOrderRoutes(call, who, body) {
  const lines = body.lines ?? [];
  const placeholder = lines.length ? null : call("GET /products", who, { query: { pageSize: 1 } }).data[0];
  const qtLines = lines.length ? lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice })) : [{ productId: placeholder.id, quantity: 1, unitPrice: 1 }];
  const qt = call("POST /qt", who, { body: { qtNumber: nextQtNumber(), qtDate: body.orderDate ?? today(), customerId: body.customerId, lines: qtLines } }).data;
  const { order } = call("POST /qt/:id/confirm", who, { params: { id: qt.id } });
  const data = call("PUT /orders/:id", who, { params: { id: order.id }, body: { orderDate: body.orderDate ?? order.orderDate, notes: body.notes ?? "", lines } });
  return { data };
}
