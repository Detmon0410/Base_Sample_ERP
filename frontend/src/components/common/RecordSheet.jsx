import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { DetailSheet } from "@/components/common/DetailSheet";
import { RecordActions } from "@/components/common/RecordActions";
import { RecordDialogs } from "@/components/common/RecordDialogs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CARD_CLASS } from "@/components/common/SheetSection";

/**
 * The whole detail sheet of a master data record: header (title, status, icon actions), the three
 * confirmations, and the loading / not found / error states. `page` is the result of useRecordForm.
 *
 *   entityTitle  name of the list ("Materials"), used while nothing is loaded
 *   newTitle     title of a new record ("New material")
 *   titleOf      (record) => title of a saved record; default "CODE · Name"
 *   singular     "material", used in the confirmation texts
 *   formId       id of the <form> that Save in the header submits
 */
export function RecordSheet({ page, entityTitle, newTitle, titleOf = (record) => `${record.code} · ${record.name}`, singular, formId, children }) {
  const { t } = useTranslation("master");
  const { isNew, record, loadState, leaving, goToList, listPath } = page;

  if (loadState === "loading") {
    return (
      <DetailSheet open={!leaving} title={entityTitle} onClose={goToList}>
        <div className="flex flex-col gap-4 p-5" aria-busy="true">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </DetailSheet>
    );
  }
  if (loadState !== "ready") {
    return (
      <DetailSheet open={!leaving} title={entityTitle} onClose={goToList}>
        <div role="alert" className={`m-5 flex flex-col items-start gap-4 p-6 ${CARD_CLASS}`}>
          <p>{t(loadState === "notFound" ? "common.notFound" : "common.loadError")}</p>
          <Button asChild variant="outline">
            <Link to={listPath}>{t("common.backToList")}</Link>
          </Button>
        </div>
      </DetailSheet>
    );
  }

  const isActive = record?.status === "active";

  return (
    <>
      <DetailSheet
        open={!leaving}
        title={isNew ? newTitle : titleOf(record)}
        onClose={goToList}
        actions={
          <RecordActions
            formId={formId}
            isSubmitting={page.isSubmitting}
            isNew={isNew}
            isActive={isActive}
            busy={page.busy}
            onToggleStatus={page.toggleStatus}
            onDelete={() => page.setDialog("delete")}
          />
        }
      >
        {children}
      </DetailSheet>

      <RecordDialogs
        dialog={page.dialog}
        setDialog={page.setDialog}
        busy={page.busy}
        onRemove={page.remove}
        onLeave={() => page.exitTo(listPath)}
        name={singular}
      />
    </>
  );
}

/** Scrolling body of a form inside the sheet: cards on the grey background. */
export function SheetFormBody({ children }) {
  return <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">{children}</div>;
}
