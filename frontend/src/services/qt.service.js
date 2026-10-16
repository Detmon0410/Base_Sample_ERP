import { api, unwrap } from "./api.js";
import { createCrud } from "./crud.js";

// QT references (docs/api/qt.md).
export const qtApi = {
  ...createCrud("/qt"),
  /**
   * Confirm QT: the QT becomes Confirmed and one production order is made from its lines. Once only: a second call answers the same order.
   * Returns { qt, order, alreadyConfirmed, warnings } (warnings: "NO_PO_FILE" when no PO of the customer is attached).
   */
  confirm: async (id) => unwrap(await api.post(`/qt/${id}/confirm`)),
};
