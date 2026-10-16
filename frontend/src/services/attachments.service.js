import { api, unwrap } from "./api.js";

// Files kept with a record: a QT, a production order, (a purchase order). See docs/api/files.md.
export const attachmentsApi = {
  /** The files of one record, newest first, without the file content: [{ id, kind, fileName, fileType, size, uploadedByName, at }]. */
  list: async (ownerType, ownerId) => unwrap(await api.get("/attachments", { params: { ownerType, ownerId } })),
  /** One file with its content: { ..., file: { name, type, dataUrl } }. */
  get: async (id) => unwrap(await api.get(`/attachments/${id}`)),
  /** Adds a file: { ownerType, ownerId, kind, file: { name, dataUrl } }. A new PO_FILE replaces the old one. */
  create: async (body) => unwrap(await api.post("/attachments", body)),
  remove: async (id) => unwrap(await api.delete(`/attachments/${id}`)),
};
