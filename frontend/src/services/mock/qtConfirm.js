// Confirm QT: the QT becomes Confirmed and ONE production order is made from its lines (docs/api/qt.md). Pressing it again changes nothing and
// returns the order that exists. The customer's PO file goes to the order too (a Factory Worker cannot read the QT, but needs the PO).

import { MockHttpError } from "./errors.js";
import { attachments, syncOrderPoFile } from "./attachments.js";
import { invalid, issue } from "./master.js";
import { createOrderFromQt, orderView, orders } from "./orders.js";
import { qtReferences, qtRoutes } from "./qt.js";
import { requireCan } from "./users.js";

export const qtConfirmRoutes = {
  "POST /qt/:id/confirm": ({ authorization, params }) => {
    requireCan(authorization, "qt.use");
    const qt = qtReferences.find((item) => item.id === Number(params.id));
    if (!qt) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
    const qtView = (record) => qtRoutes["GET /qt/:id"]({ authorization, params: { id: record.id } });

    // once only: a QT that is confirmed shows its order
    const made = orders.find((order) => order.id === qt.productionOrderId);
    if (made) return { qt: qtView(qt), order: orderView(made), alreadyConfirmed: true, warnings: [] };

    const issues = [];
    if (qt.lines.length === 0) issues.push(issue("lines", "REQUIRED"));
    if (issues.length) invalid(issues);

    const order = createOrderFromQt(qt);
    qt.status = "Confirmed";
    qt.productionOrderId = order.id;
    qt.updatedAt = new Date().toISOString();
    syncOrderPoFile(qt);

    const hasPo = attachments.some((item) => item.ownerType === "QtReference" && item.ownerId === qt.id && item.kind === "PO_FILE");
    return { qt: qtView(qt), order: orderView(order), alreadyConfirmed: false, warnings: hasPo ? [] : ["NO_PO_FILE"] };
  },
};
