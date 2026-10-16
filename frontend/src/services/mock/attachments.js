// Files kept with a record (docs/api/files.md): the customer's PO and the quotation of a QT, the evidence of a production order.
//
// An attachment: { id, ownerType, ownerId, kind, fileName, fileType, size, dataUrl, uploadedBy, uploadedByName, at }
//   ownerType  "QtReference" | "ProductionOrder" | "PurchaseOrder"
//   kind       "PO_FILE" | "QUOTATION" | "EVIDENCE" | "OTHER"; a new PO_FILE replaces the old one of the same owner
// PDF, PNG or JPG, up to 10 MB. The list never carries the file (dataUrl); one attachment does.

import { MockHttpError, MockResponse } from "./errors.js";
import { invalid, issue, text } from "./master.js";
import { orders } from "./orders.js";
import { purchaseOrders } from "./purchase.js";
import { qtReferences } from "./qt.js";
import { requireCan, userFromAuthorization } from "./users.js";

export const attachments = [];

const MAX_BYTES = 10 * 1024 * 1024;
const FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];

// who owns files, where to look for the owner, which kinds it may have and which actions read and write its files
const OWNERS = {
  QtReference: { store: qtReferences, kinds: ["QUOTATION", "PO_FILE", "OTHER"], read: "qt.use", write: "qt.use" },
  PurchaseOrder: { store: purchaseOrders, kinds: ["PO_FILE", "QUOTATION", "OTHER"], read: "purchase.use", write: "purchase.use" },
  // a PO_FILE of an order is the copy of the PO of its QT: the system makes it (syncOrderPoFile), a user cannot upload or delete it
  ProductionOrder: { store: orders, kinds: ["EVIDENCE", "OTHER"], read: "orders.view", write: "orders.evidence" },
};

let nextId = 1;

const listView = ({ dataUrl: _dataUrl, ...rest }) => rest;
const fullView = (record) => ({ ...listView(record), file: { name: record.fileName, type: record.fileType, dataUrl: record.dataUrl } });
/** The size of the file in a data URL: the base64 part is 4 characters for 3 bytes (less the "=" at the end). */
const bytesOf = (dataUrl) => {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
};

function ownerOf(ownerType) {
  const owner = OWNERS[ownerType];
  if (!owner) invalid([issue("ownerType", ownerType ? "INVALID" : "REQUIRED")]);
  return owner;
}

function checkOwnerExists(owner, ownerId) {
  if (!owner.store.some((record) => record.id === Number(ownerId))) throw new MockHttpError(404, "NOT_FOUND", "The record of the file was not found");
}

function find(id) {
  const record = attachments.find((item) => item.id === Number(id));
  if (!record) throw new MockHttpError(404, "NOT_FOUND", "File not found");
  return record;
}

/** Removes the files of a record: all of them (a QT that is deleted takes its files with it), or only those of one `kind`. */
export function removeAttachmentsOf(ownerType, ownerId, kind) {
  for (let index = attachments.length - 1; index >= 0; index -= 1) {
    const item = attachments[index];
    if (item.ownerType === ownerType && item.ownerId === Number(ownerId) && (!kind || item.kind === kind)) attachments.splice(index, 1);
  }
}

/**
 * Keeps the PO file of an order the same as the PO file of its QT: a copy (kind PO_FILE, owner the order) so that everyone who reads the
 * order can read the customer's PO, also a Factory Worker who has no access to the QT. No PO file on the QT means no copy.
 */
export function syncOrderPoFile(qt) {
  if (!qt.productionOrderId) return;
  removeAttachmentsOf("ProductionOrder", qt.productionOrderId, "PO_FILE");
  const source = attachments.find((item) => item.ownerType === "QtReference" && item.ownerId === qt.id && item.kind === "PO_FILE");
  if (source) attachments.push({ ...source, id: nextId++, ownerType: "ProductionOrder", ownerId: qt.productionOrderId });
}

const qtOf = (record) => (record.ownerType === "QtReference" ? qtReferences.find((qt) => qt.id === record.ownerId) : null);

export const attachmentRoutes = {
  "GET /attachments": ({ authorization, query }) => {
    userFromAuthorization(authorization);
    const owner = ownerOf(text(query.ownerType));
    requireCan(authorization, owner.read);
    checkOwnerExists(owner, query.ownerId);
    return attachments
      .filter((item) => item.ownerType === query.ownerType && item.ownerId === Number(query.ownerId))
      .reverse()
      .map(listView);
  },

  "GET /attachments/:id": ({ authorization, params }) => {
    userFromAuthorization(authorization);
    const record = find(params.id);
    requireCan(authorization, OWNERS[record.ownerType].read);
    return fullView(record);
  },

  "POST /attachments": ({ authorization, body }) => {
    const user = userFromAuthorization(authorization);
    const ownerType = text(body.ownerType);
    const owner = ownerOf(ownerType);
    requireCan(authorization, owner.write);
    checkOwnerExists(owner, body.ownerId);

    const kind = text(body.kind);
    const file = body.file;
    const issues = [];
    if (!owner.kinds.includes(kind)) issues.push(issue("kind", kind ? "INVALID" : "REQUIRED"));
    let type = null;
    if (!file?.dataUrl) issues.push(issue("file", "REQUIRED"));
    else {
      type = /^data:([^;,]+)[;,]/.exec(file.dataUrl)?.[1];
      if (!FILE_TYPES.includes(type)) issues.push(issue("file", "FILE_TYPE"));
      else if (bytesOf(file.dataUrl) > MAX_BYTES) issues.push(issue("file", "FILE_TOO_BIG"));
    }
    if (issues.length) invalid(issues);

    if (kind === "PO_FILE") removeAttachmentsOf(ownerType, body.ownerId, "PO_FILE"); // one PO file per owner: the new one replaces it
    const record = {
      id: nextId++,
      ownerType,
      ownerId: Number(body.ownerId),
      kind,
      fileName: text(file.name) || "file",
      fileType: type,
      size: bytesOf(file.dataUrl),
      dataUrl: file.dataUrl,
      uploadedBy: user.id,
      uploadedByName: user.name,
      at: new Date().toISOString(),
    };
    attachments.push(record);
    if (kind === "PO_FILE") syncOrderPoFile(qtOf(record) ?? {}); // a PO file added to a QT that is confirmed reaches its order
    return new MockResponse({ data: listView(record), status: 201 });
  },

  "DELETE /attachments/:id": ({ authorization, params }) => {
    userFromAuthorization(authorization);
    const record = find(params.id);
    requireCan(authorization, OWNERS[record.ownerType].write);
    if (record.ownerType === "ProductionOrder" && record.kind === "PO_FILE") throw new MockHttpError(409, "FILE_LOCKED", "The PO file of an order follows the PO file of its QT");
    attachments.splice(attachments.indexOf(record), 1);
    if (record.kind === "PO_FILE") syncOrderPoFile(qtOf(record) ?? {}); // a PO file taken from a confirmed QT leaves its order too
    return null;
  },
};
