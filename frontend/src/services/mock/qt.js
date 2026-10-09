// QT references (docs/specs/s1-mini-erp-workflow.md, section 2 step 1): the quotation is made outside the system; here only its
// reference is kept - QT number, QT date, customer, notes and the file of the quotation (a data URL in the mock, Q8).
// A QT reference: { id, qtNumber, qtDate, customerId, notes, file: { name, type, dataUrl }, status }.

import { customers, invalid, issue, resource, text } from "./master.js";

export const qtReferences = [];

const MAX_BYTES = 10 * 1024 * 1024;
const FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];

/** "YYYY-MM-DD" that is a real day. */
const isDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
};

const customerName = (record) => customers.find((customer) => customer.id === record.customerId)?.name ?? "";
const withCustomer = (record) => ({ ...record, customerName: customerName(record) });
const withoutFileData = (record) => {
  const { dataUrl: _dataUrl, ...file } = record.file;
  return { ...withCustomer(record), file };
};

export const qtRoutes = resource({
  path: "/qt",
  store: qtReferences,
  readRoles: ["Admin"],
  unique: ["qtNumber"],
  withStatus: true,
  searchIn: ["qtNumber", "notes", customerName],
  toView: withCustomer,
  toListView: withoutFileData,
  normalize: (body) => {
    const data = { qtNumber: text(body.qtNumber), qtDate: text(body.qtDate), customerId: Number(body.customerId), notes: text(body.notes), file: null };
    const issues = [];
    if (!data.qtNumber) issues.push(issue("qtNumber", "REQUIRED"));
    if (!data.qtDate) issues.push(issue("qtDate", "REQUIRED"));
    else if (!isDay(data.qtDate)) issues.push(issue("qtDate", "INVALID_DATE"));
    if (!customers.some((customer) => customer.id === data.customerId)) issues.push(issue("customerId", "REQUIRED"));

    const file = body.file;
    if (!file?.dataUrl) issues.push(issue("file", "REQUIRED"));
    else {
      const type = /^data:([^;,]+)[;,]/.exec(file.dataUrl)?.[1];
      const bytes = Math.floor((file.dataUrl.length * 3) / 4);
      if (!FILE_TYPES.includes(type)) issues.push(issue("file", "FILE_TYPE"));
      else if (bytes > MAX_BYTES) issues.push(issue("file", "FILE_TOO_BIG"));
      else data.file = { name: text(file.name) || "quotation", type, dataUrl: file.dataUrl };
    }
    if (issues.length) invalid(issues);
    return data;
  },
});
