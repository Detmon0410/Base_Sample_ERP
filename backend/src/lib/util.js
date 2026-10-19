import { notFound } from "./errors.js";

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const ok = (res, data = null, extra = {}) => res.json({ success: true, data, ...extra });
export const created = (res, data, extra = {}) => res.status(201).json({ success: true, data, ...extra });

export function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw notFound();
  return id;
}

export function paging(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(query.pageSize, 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export const meta = (p, total) => ({ meta: { page: p.page, pageSize: p.pageSize, total } });

// "YYYY-MM-DD" that is a real day -> Date at UTC midnight; otherwise null
export function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

export const ymd = (d) => (d ? d.toISOString().slice(0, 10) : null);
export const iso = (d) => (d ? d.toISOString() : null);
export const num = (d) => (d === null || d === undefined ? null : Number(d));
export const today = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

// Up to 3 decimals, as a number
export function isQty(value, { min = 0, allowMin = false } = {}) {
  if (typeof value === "string" && value.trim() === "") return false;
  const n = Number(value);
  if (!Number.isFinite(n)) return false;
  if (Math.round(n * 1000) / 1000 !== n) return false;
  return allowMin ? n >= min : n > min;
}

export const isInt = (v) => typeof v === "number" && Number.isInteger(v);
export const str = (v) => (typeof v === "string" ? v.trim() : "");
export const containsFilter = (fields, q) => ({ OR: fields.map((f) => ({ [f]: { contains: q } })) });

// "ORD-2026-0001": the next number of a year, from the highest one in use
export async function nextNumber(tx, model, field, prefix) {
  const year = new Date().getUTCFullYear();
  const head = `${prefix}-${year}-`;
  const last = await tx[model].findFirst({ where: { [field]: { startsWith: head } }, orderBy: { [field]: "desc" }, select: { [field]: true } });
  const n = last ? parseInt(last[field].slice(head.length), 10) + 1 : 1;
  return `${head}${String(n).padStart(4, "0")}`;
}
