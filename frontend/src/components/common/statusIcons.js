import { Banknote, CheckCheck, CircleAlert, CircleCheck, CircleX, Clock, FilePen, Factory, ListFilter, PackageCheck, ReceiptText, Send } from "lucide-react";

/**
 * The icon of a status tab, by the status (a space is left out: "In Progress" is InProgress). The same status has the same icon on every
 * list. The word is always written beside it; the icon only helps the eye.
 */
export const STATUS_ICONS = {
  all: ListFilter,
  // QT: the steps of a job; production orders: Draft, In progress, Completed
  Draft: FilePen,
  Confirmed: CircleCheck,
  InProduction: Factory,
  InProgress: Factory,
  Done: CheckCheck,
  Completed: CheckCheck,
  // purchase orders
  Sent: Send,
  Received: PackageCheck,
  // stock
  Normal: CircleCheck,
  Low: CircleAlert,
  Out: CircleX,
  // accounting
  toInvoice: ReceiptText,
  unpaid: Clock,
  paid: CircleCheck,
  toPay: Banknote,
  paidOut: CheckCheck,
};
