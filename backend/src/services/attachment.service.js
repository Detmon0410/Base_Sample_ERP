import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { Issues, conflict, forbidden, notFound } from "../lib/errors.js";
import { isInt, iso, str } from "../lib/util.js";
import { can } from "../lib/permissions.js";

export const MAX_BYTES = 10 * 1024 * 1024;

const OWNERS = {
  QtReference: { kinds: ["PO_FILE", "QUOTATION", "OTHER"], read: can.adminOrSales, write: can.adminOrSales, model: "qtReference" },
  ProductionOrder: { kinds: ["EVIDENCE", "OTHER"], read: can.everyone, write: can.adminOrFactory, model: "productionOrder" },
  PurchaseOrder: { kinds: ["PO_FILE", "QUOTATION", "OTHER"], read: can.adminOrFactory, write: can.adminOrFactory, model: "purchaseOrder" }
};

const root = () => resolve(env.uploadDir);
const absolute = (filePath) => resolve(root(), filePath);

const view = (a) => ({
  id: a.id,
  ownerType: a.ownerType,
  ownerId: a.ownerId,
  kind: a.kind,
  fileName: a.fileName,
  fileType: a.fileType,
  size: a.size,
  uploadedBy: a.uploadedBy,
  uploadedByName: a.user.name,
  at: iso(a.at)
});
const include = { user: true };

// The media type is read from the file, not trusted from the name
function sniff(buf) {
  if (buf.length >= 4 && buf.subarray(0, 4).toString("latin1") === "%PDF") return { type: "application/pdf", ext: ".pdf" };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: "image/png", ext: ".png" };
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { type: "image/jpeg", ext: ".jpg" };
  return null;
}

function checkOwnerType(ownerType) {
  const issues = new Issues();
  if (!ownerType) issues.add("ownerType", "REQUIRED");
  else if (!OWNERS[ownerType]) issues.add("ownerType", "INVALID");
  issues.throwIfAny();
  return OWNERS[ownerType];
}

async function ownerExists(ownerType, ownerId) {
  if (!isInt(ownerId)) return false;
  return !!(await prisma[OWNERS[ownerType].model].findUnique({ where: { id: ownerId } }));
}

async function removeStored(filePath) {
  await rm(absolute(filePath), { force: true });
}

export async function list(query, user) {
  const owner = checkOwnerType(query.ownerType);
  if (!owner.read(user)) throw forbidden();
  const ownerId = Number(query.ownerId);
  if (!(await ownerExists(query.ownerType, ownerId))) throw notFound("Owner not found");
  const rows = await prisma.attachment.findMany({
    where: { ownerType: query.ownerType, ownerId },
    include,
    orderBy: [{ at: "desc" }, { id: "desc" }]
  });
  return rows.map(view);
}

async function load(id) {
  const a = await prisma.attachment.findUnique({ where: { id }, include });
  return a;
}

export async function get(id, user) {
  const a = await load(id);
  if (a && !OWNERS[a.ownerType].read(user)) throw forbidden();
  if (!a) throw notFound("File not found");
  const content = await readFile(absolute(a.filePath)).catch(() => null);
  if (!content) throw notFound("File not found");
  return { ...view(a), file: { name: a.fileName, type: a.fileType, dataUrl: `data:${a.fileType};base64,${content.toString("base64")}` } };
}

export async function create(body, user) {
  const owner = checkOwnerType(body.ownerType);
  if (!owner.write(user)) throw forbidden();

  const issues = new Issues();
  if (!isInt(body.ownerId)) issues.add("ownerId", "REQUIRED");
  if (!body.kind) issues.add("kind", "REQUIRED");
  else if (!owner.kinds.includes(body.kind)) issues.add("kind", "INVALID");

  let buf = null;
  const dataUrl = body.file?.dataUrl;
  if (!body.file || typeof dataUrl !== "string") issues.add("file", "REQUIRED");
  else {
    const m = /^data:[^;,]*;base64,(.*)$/s.exec(dataUrl);
    if (!m) issues.add("file", "INVALID");
    else {
      buf = Buffer.from(m[1], "base64");
      if (buf.length > MAX_BYTES) issues.add("file", "FILE_TOO_BIG");
      else if (!sniff(buf)) issues.add("file", "FILE_TYPE");
    }
  }
  issues.throwIfAny();
  if (!(await ownerExists(body.ownerType, body.ownerId))) throw notFound("Owner not found");

  const { type, ext } = sniff(buf);
  const filePath = `${randomUUID()}${ext}`;
  await mkdir(root(), { recursive: true });
  await writeFile(absolute(filePath), buf);

  const fileName = basename(str(body.file.name) || `file${ext}`);
  const make = (ownerType, ownerId, tx) =>
    tx.attachment.create({
      data: { ownerType, ownerId, kind: body.kind, fileName, fileType: type, size: buf.length, filePath, uploadedBy: user.id },
      include
    });

  const stale = [];
  const created = await prisma.$transaction(async (tx) => {
    // One PO_FILE per owner: a new one replaces the old one (and the copy on the order)
    if (body.kind === "PO_FILE") {
      const old = await tx.attachment.findMany({ where: { ownerType: body.ownerType, ownerId: body.ownerId, kind: "PO_FILE" } });
      stale.push(...old.map((o) => o.filePath));
      await tx.attachment.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
    }
    const a = await make(body.ownerType, body.ownerId, tx);
    if (body.kind === "PO_FILE" && body.ownerType === "QtReference") {
      const qt = await tx.qtReference.findUnique({ where: { id: body.ownerId } });
      if (qt?.productionOrderId) stale.push(...(await syncPoCopy(tx, qt, a)));
    }
    return a;
  });
  await Promise.all(stale.map(removeStored));
  return view(created);
}

// Puts the PO file of a confirmed QT on its order as a copy. Returns the stored files that are no longer used.
async function syncPoCopy(tx, qt, source) {
  const old = await tx.attachment.findMany({ where: { ownerType: "ProductionOrder", ownerId: qt.productionOrderId, kind: "PO_FILE" } });
  await tx.attachment.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  if (source) {
    const filePath = `${randomUUID()}${extname(source.filePath)}`;
    await copyFile(absolute(source.filePath), absolute(filePath));
    await tx.attachment.create({
      data: {
        ownerType: "ProductionOrder",
        ownerId: qt.productionOrderId,
        kind: "PO_FILE",
        fileName: source.fileName,
        fileType: source.fileType,
        size: source.size,
        filePath,
        uploadedBy: source.uploadedBy
      }
    });
  }
  return old.map((o) => o.filePath);
}

// Confirm QT: the order gets a copy of the PO file. Returns true when there was one.
export async function copyPoToOrder(tx, qt) {
  const po = await tx.attachment.findFirst({ where: { ownerType: "QtReference", ownerId: qt.id, kind: "PO_FILE" } });
  if (!po) return false;
  await syncPoCopy(tx, qt, po);
  return true;
}

export async function remove(id, user) {
  const a = await load(id);
  if (a && !OWNERS[a.ownerType].write(user)) throw forbidden();
  if (!a) throw notFound("File not found");
  if (a.ownerType === "ProductionOrder" && a.kind === "PO_FILE") throw conflict("FILE_LOCKED", "The PO file of an order cannot be deleted here");

  const stale = [a.filePath];
  await prisma.$transaction(async (tx) => {
    await tx.attachment.delete({ where: { id } });
    if (a.ownerType === "QtReference" && a.kind === "PO_FILE") {
      const qt = await tx.qtReference.findUnique({ where: { id: a.ownerId } });
      if (qt?.productionOrderId) stale.push(...(await syncPoCopy(tx, qt, null)));
    }
  });
  await Promise.all(stale.map(removeStored));
}

// The files of a record go with it
export async function removeAllFor(tx, ownerType, ownerId) {
  const rows = await tx.attachment.findMany({ where: { ownerType, ownerId } });
  await tx.attachment.deleteMany({ where: { ownerType, ownerId } });
  return rows.map((r) => r.filePath);
}

export const deleteStored = (paths) => Promise.all(paths.map(removeStored));
