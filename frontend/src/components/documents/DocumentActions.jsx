import {
  ArrowRightIcon,
  BanIcon,
  CalendarCheckIcon,
  FlagIcon,
  PlayIcon,
  WarehouseIcon,
  CheckIcon,
  ClockIcon,
  FactoryIcon,
  FilePlusIcon,
  LockIcon,
  PackageCheckIcon,
  SendIcon,
  TruckIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ActionDialog } from "./ActionDialog";

const ICONS = {
  send: SendIcon,
  accept: CheckIcon,
  reject: XIcon,
  expire: ClockIcon,
  "create-order": FilePlusIcon,
  "request-confirm": SendIcon,
  approve: CheckIcon,
  "send-to-factory": FactoryIcon,
  "mark-ready": PackageCheckIcon,
  "create-delivery-note": TruckIcon,
  close: LockIcon,
  cancel: BanIcon,
  confirm: CheckIcon,
  revert: Undo2Icon,
  schedule: CalendarCheckIcon,
  "back-to-draft": Undo2Icon,
  start: PlayIcon,
  finish: FlagIcon,
  transfer: WarehouseIcon,
  post: CheckIcon,
  postReceipt: CheckIcon,
  issue: SendIcon,
  confirmMoney: CheckIcon,
  cancelMoney: BanIcon,
  reverse: Undo2Icon,
  cancelReceipt: BanIcon,
  "close-remaining": LockIcon,
};

// Status buttons have no border, only a light fill. The main button of a document (action.primary) is the light-blue
// brand button; the others have their own colour: red for rejecting / cancelling, amber for expiring, grey for
// the rest (revert, close).
const OTHER = {
  reject: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  cancel: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  cancelReceipt: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  cancelMoney: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  reverse: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  expire: "bg-warning/10 text-warning hover:bg-warning/20",
};
const NEUTRAL = "bg-slate-100 text-slate-700 hover:bg-slate-200";

/**
 * The status buttons of a document (see config/sale.js for who sees which). Pressing one opens a confirmation
 * (ActionDialog) with the texts of sale:actions.<key>; confirming calls `onRun(action, note)`.
 * `namespace`: the text namespace with `actions.<key>.*` (another module can bring its own buttons, e.g. "factory").
 * `disabled`: the form has unsaved edits, which a status change would throw away, so save first.
 */
export function DocumentActions({ actions, onRun, disabled = false, namespace = "sale" }) {
  const { t } = useTranslation(namespace);
  const [pending, setPending] = useState(null);
  if (actions.length === 0) return null;

  const texts = (key) => ({
    title: t(`actions.${key}.title`),
    description: t(`actions.${key}.description`),
    label: t(`actions.${key}.button`),
    confirm: t(`actions.${key}.confirm`),
  });

  return (
    <>
      {actions.map((action) => {
        const Icon = ICONS[action.key] ?? ArrowRightIcon;
        const { label } = texts(action.key);
        return (
          <Button
            key={`${action.key}-${action.noteLabel}`}
            type="button"
            size="sm"
            className={cn("h-9", !action.primary && (OTHER[action.key] ?? NEUTRAL))}
            variant="secondary"
            disabled={disabled}
            title={disabled ? t("actions.saveFirst") : undefined}
            onClick={() => setPending(action)}
          >
            <Icon aria-hidden="true" /> {label}
          </Button>
        );
      })}

      {pending ? (
        <ActionDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={texts(pending.key).title}
          description={texts(pending.key).description}
          confirmLabel={texts(pending.key).confirm}
          noteMode={pending.noteLabel}
          danger={pending.danger}
          onConfirm={(note) => onRun(pending, note)}
        />
      ) : null}
    </>
  );
}
