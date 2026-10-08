import { CheckIcon, MinusIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/common/PageHeader";
import { RoleHat } from "@/components/common/RoleHat";
import { CARD_CLASS, PANEL_CLASS } from "@/components/common/SheetSection";
import { MENU_AUDIENCES, ROLES, menuTable, permissionTable } from "@/config/permissions";

/** A yes / no cell: a tick with the word "Yes", or a dash with "No" (never colour alone). */
function Mark({ yes }) {
  const { t } = useTranslation("users");
  return yes ? (
    <span className="inline-flex items-center gap-1.5 font-semibold text-success">
      <CheckIcon className="size-5" aria-hidden="true" /> {t("matrixPage.yes")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <MinusIcon className="size-5" aria-hidden="true" /> {t("matrixPage.no")}
    </span>
  );
}

const CELL = "border-t border-slate-200/70 px-4 py-2.5";
const HEAD = "px-4 py-3 text-left text-sm font-semibold text-muted-foreground";

/** U3 Departments and roles: read-only. Both tables are computed from the same rules the program uses. */
export function RolesPage() {
  const { t } = useTranslation(["users", "nav"]);
  const permissions = useMemo(() => permissionTable(), []);
  const menus = useMemo(() => menuTable(), []);

  return (
    <>
      <PageHeader title={t("nav:items.roles")} />
      <div className="flex flex-col gap-5">
        <p className="m-0 max-w-4xl text-muted-foreground">{t("users:matrixPage.intro")}</p>

        {permissions.map(({ department, rows }) => (
          <section key={department} className={`${CARD_CLASS} overflow-hidden`} aria-labelledby={`matrix-${department}`}>
            <h2 id={`matrix-${department}`} className="m-0 px-5 py-4 text-lg font-bold">
              {t(`users:departments.${department}`)}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" aria-label={`${t("users:matrixPage.tableLabel")}: ${t(`users:departments.${department}`)}`}>
                <thead>
                  <tr>
                    <th scope="col" className={HEAD}>{t("users:matrixPage.action")}</th>
                    {ROLES.map((role) => (
                      <th key={role} scope="col" className={`${HEAD} w-40`}><span className="inline-flex items-center gap-2"><RoleHat role={role} className="size-5" />{t(`users:roles.${role}`)}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <th scope="row" className={`${CELL} text-left font-normal`}>{t(`users:matrix.${department}.${row.key}`)}</th>
                      {ROLES.map((role) => (
                        <td key={role} className={CELL}><Mark yes={row.cells[role]} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        <p className="m-0 max-w-4xl text-sm text-muted-foreground">{t("users:matrixPage.note")}</p>

        <section className={`${PANEL_CLASS} overflow-hidden`} aria-labelledby="matrix-menus">
          <h2 id="matrix-menus" className="m-0 px-5 py-4 text-lg font-bold">{t("users:matrixPage.menuTitle")}</h2>
          <p className="m-0 px-5 pb-3 text-muted-foreground">{t("users:matrixPage.menuIntro")}</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" aria-label={t("users:matrixPage.menuLabel")}>
              <thead>
                <tr>
                  <th scope="col" className={HEAD}>{t("users:matrixPage.menu")}</th>
                  {MENU_AUDIENCES.map((who) => (
                    <th key={who} scope="col" className={`${HEAD} w-32`}>{t(`users:matrixPage.audiences.${who}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menus.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className={`${CELL} text-left font-normal`}>{t(`nav:${row.labelKey}`)}</th>
                    {MENU_AUDIENCES.map((who) => (
                      <td key={who} className={CELL}><Mark yes={row.sees[who]} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
