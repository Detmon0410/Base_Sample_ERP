import { useTranslation } from "react-i18next";

import { RoleHat } from "@/components/common/RoleHat";

/** "Sale · Manager" for each department and role of a user, with a safety helmet in the colour of the role. The Admin role has no department. */
export function RoleChips({ memberships }) {
  const { t } = useTranslation("users");
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0">
      {memberships.map((row) => (
        <li key={`${row.department}-${row.role}`} className="inline-flex items-center gap-1.5">
          <RoleHat role={row.role} />
          {row.role === "Admin" ? t("roles.Admin") : `${t(`departments.${row.department}`)} · ${t(`roles.${row.role}`)}`}
        </li>
      ))}
    </ul>
  );
}
