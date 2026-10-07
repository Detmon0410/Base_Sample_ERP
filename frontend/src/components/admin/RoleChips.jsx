import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/common/StatusBadge";

/** "Sale · Manager" chips of the departments and roles of a user; the Admin role has no department. */
export function RoleChips({ memberships }) {
  const { t } = useTranslation("users");
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {memberships.map((row) => (
        <li key={`${row.department}-${row.role}`}>
          <StatusBadge tone={row.role === "Admin" ? "warning" : "neutral"} icon={null}>
            {row.role === "Admin" ? t("roles.Admin") : `${t(`departments.${row.department}`)} · ${t(`roles.${row.role}`)}`}
          </StatusBadge>
        </li>
      ))}
    </ul>
  );
}
