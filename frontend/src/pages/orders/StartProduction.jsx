import { PackagePlus, Play, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ordersApi } from "@/services/orders.service";
import { formatNumber } from "@/utils/format";
import { can } from "@/utils/permissions";
import { applyServerErrors } from "@/utils/serverErrors";

const NO_FORM = { setError: () => {} }; // the start has no fields: only the sentence of the error is wanted

/**
 * Start production of an order (a question first). The start deducts the BOM from the stock; when a material is short nothing starts and
 * the alert lists the short materials, each with an "Add stock" link. It is used by the form of an order (a Sale Worker or an Admin who
 * prepares it) and by the page of an order (a Factory Worker who starts it), so both look the same.
 *
 * Returns the three pieces the page places where it wants them: `button`, `dialog` and `alert`.
 */
export function useStartProduction(order, onChanged) {
  const { t, i18n } = useTranslation(["orders", "common"]);
  const { user } = useAuth();
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState(null);
  const [short, setShort] = useState([]); // [{ materialId, materialCode, materialName, need, have }]

  const start = async () => {
    setAsking(false);
    setMessage(null);
    setShort([]);
    try {
      await ordersApi.start(order.id);
      toast.success(t("orders:start.done"));
      onChanged();
    } catch (error) {
      if (error?.code === "STOCK_SHORT" && Array.isArray(error.details)) {
        setShort(error.details);
        setMessage(t("orders:errors.STOCK_SHORT"));
      } else {
        setMessage(applyServerErrors(NO_FORM, error, t));
      }
    }
  };

  const button = (
    <Button type="button" onClick={() => setAsking(true)}>
      <Play aria-hidden="true" />
      {t("orders:start.button")}
    </Button>
  );

  const dialog = (
    <AlertDialog open={asking} onOpenChange={setAsking}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("orders:start.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("orders:start.text")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <X aria-hidden="true" />
            {t("common:actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={start}>{t("common:actions.confirm")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const alert = message ? (
    <Alert variant="destructive">
      <AlertDescription className="text-base">
        {message}
        {short.length ? (
          <ul className="mt-3 flex list-none flex-col gap-2 p-0">
            {short.map((row) => (
              <li key={row.materialId} className="flex flex-wrap items-center gap-3">
                <span>{t("orders:start.short", { name: `${row.materialCode} ${row.materialName}`, need: formatNumber(row.need, i18n.language), have: formatNumber(row.have, i18n.language) })}</span>
                <Button asChild size="sm">
                  <Link to={`/stock/materials/${row.materialId}?add=${Math.round((row.need - row.have) * 1000) / 1000}&order=${order.id}`}>
                    <PackagePlus aria-hidden="true" />
                    {t("orders:start.addStock")}
                  </Link>
                </Button>
                {can(user, "purchase.use") ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/purchase/orders/new?material=${row.materialId}`}>
                      <ShoppingCart aria-hidden="true" />
                      {t("orders:start.createPo")}
                    </Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </AlertDescription>
    </Alert>
  ) : null;

  return { button, dialog, alert };
}
