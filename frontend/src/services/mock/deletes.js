// The delete of the master data and of the QT references.
//
// DELETE /{resource}/:id  (Admin). A record that is still used is NOT deleted: the answer is `409 IN_USE` and `errors` says where it
// is used, as a list of { kind, count, items }. Nothing is made inactive instead.
//
//   customers   used by a QT reference or a production order (an invoice keeps its own copy of the name and the address)
//   products    used by a line of a production order (the BOM goes with the product)
//   materials   used by the BOM of a product, or has a stock change after the first stock (the lots and the first stock go with it)
//   users       signed in now, the last Admin, or recorded a progress update or a stock change
//   QT          used by a production order (the file goes with it)

import { removeAttachmentsOf } from "./attachments.js";
import { MockHttpError } from "./errors.js";
import { customers, materials, products } from "./master.js";
import { orders } from "./orders.js";
import { qtReferences } from "./qt.js";
import { stockChanges } from "./stock.js";
import { mockUsers, requireCan, userFromAuthorization } from "./users.js";

const SHOWN = 5; // how many names of a kind are listed

const admin = (authorization) => {
  const user = userFromAuthorization(authorization);
  if (user.role !== "Admin") throw new MockHttpError(403, "FORBIDDEN", "Not allowed");
  return user;
};

const find = (store, id) => {
  const record = store.find((item) => item.id === Number(id));
  if (!record) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
  return record;
};

/** A place where a record is used: `items` are the names to show (the first few), `count` is how many there are. */
const place = (kind, names) => (names.length ? { kind, count: names.length, items: names.slice(0, SHOWN) } : null);

/** Refuses the delete when the record is used (`places` has something), else removes it from its store. */
function remove(store, record, places) {
  const used = places.filter(Boolean);
  if (used.length) throw new MockHttpError(409, "IN_USE", "The record is still used and cannot be deleted", used);
  store.splice(store.indexOf(record), 1);
}

export const deleteRoutes = {
  "DELETE /customers/:id": ({ authorization, params }) => {
    admin(authorization);
    const customer = find(customers, params.id);
    remove(customers, customer, [
      place("qt", qtReferences.filter((qt) => qt.customerId === customer.id).map((qt) => qt.qtNumber)),
      place("order", orders.filter((order) => order.customerId === customer.id).map((order) => order.orderNumber)),
    ]);
    return null;
  },

  "DELETE /products/:id": ({ authorization, params }) => {
    admin(authorization);
    const product = find(products, params.id);
    remove(products, product, [place("order", orders.filter((order) => order.lines.some((line) => line.productId === product.id)).map((order) => order.orderNumber))]);
    return null;
  },

  "DELETE /materials/:id": ({ authorization, params }) => {
    admin(authorization);
    const material = find(materials, params.id);
    const later = stockChanges.filter((entry) => entry.materialId === material.id && !entry.initial);
    remove(materials, material, [
      place("product", products.filter((product) => product.bom.some((line) => line.materialId === material.id)).map((product) => product.code)),
      place("stockChange", later.map((entry) => String(entry.id))),
    ]);
    // the first stock of its lots goes with it
    for (let index = stockChanges.length - 1; index >= 0; index -= 1) if (stockChanges[index].materialId === material.id) stockChanges.splice(index, 1);
    return null;
  },

  "DELETE /users/:id": ({ authorization, params }) => {
    const me = admin(authorization);
    const user = find(mockUsers, params.id);
    const lastAdmin = user.role === "Admin" && mockUsers.filter((item) => item.role === "Admin").length === 1;
    remove(mockUsers, user, [
      user.id === me.id ? { kind: "self", count: 1, items: [] } : null,
      lastAdmin ? { kind: "lastAdmin", count: 1, items: [] } : null,
      place("progress", orders.flatMap((order) => order.history).filter((entry) => entry.userId === user.id).map((entry) => String(entry.id))),
      place("stock", stockChanges.filter((entry) => entry.userId === user.id).map((entry) => String(entry.id))),
    ]);
    return null;
  },

  "DELETE /qt/:id": ({ authorization, params }) => {
    requireCan(authorization, "qt.use"); // a Sale Worker deletes a QT too
    const qt = find(qtReferences, params.id);
    remove(qtReferences, qt, [place("order", orders.filter((order) => order.qtId === qt.id).map((order) => order.orderNumber))]);
    removeAttachmentsOf("QtReference", qt.id); // the files go with the QT
    return null;
  },
};
