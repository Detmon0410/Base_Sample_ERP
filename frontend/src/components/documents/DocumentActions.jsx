import {
  ArrowRightIcon,
  BanIcon,
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
};

/**
 * The status buttons of a document (see config/sale.js for who sees which). Pressing one opens a confirmation
 * (ActionDialog) with the texts of sale:actions.<key>; confirming calls `onRun(action, note)`.
 * `disabled`: the form has unsaved edits, which a status change would throw away, so save first.
 */
export function DocumentActions({ actions, onRun, disabled = false }) {
  const { t } = useTranslation("sale");
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
            className={action.danger ? "h-9 text-destructive hover:text-destructive" : "h-9"}
            variant={action.primary ? "secondary" : "outline"}
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
