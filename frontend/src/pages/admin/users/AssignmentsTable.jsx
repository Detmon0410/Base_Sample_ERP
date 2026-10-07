import { PlusIcon, Trash2Icon } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEPARTMENTS } from "@/config/permissions";

/**
 * The departments and roles of a user, one row each. The Admin role stands alone: choosing it replaces the other
 * rows and it has no department; with other rows present Admin is not offered.
 */
export function AssignmentsTable({ form, disabled = false }) {
  const { t } = useTranslation("users");
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "memberships" });
  const errors = form.formState.errors.memberships;
  const rootMessage = errors?.root?.message ?? errors?.message;
  const watched = form.watch("memberships");
  const hasAdmin = watched.some((row) => row.role === "Admin");
  const taken = new Set(watched.map((row) => row.department).filter(Boolean));

  const setRole = (index, role) => {
    if (role === "Admin") {
      replace([{ department: "", role: "Admin" }]);
      return;
    }
    form.setValue(`memberships.${index}.role`, role, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
  };

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-sm font-semibold text-muted-foreground">
            <th scope="col" className="w-1/2 pb-2 pr-3 font-semibold">{t("form.assignments.department")}</th>
            <th scope="col" className="pb-2 pr-3 font-semibold">{t("form.assignments.role")}</th>
            <th scope="col" className="w-12 pb-2"><span className="sr-only">{t("form.assignments.remove")}</span></th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, index) => {
            const row = watched[index] ?? field;
            const isAdmin = row.role === "Admin";
            const rowErrors = errors?.[index];
            return (
              <tr key={field.id} className="align-top">
                <td className="pb-3 pr-3">
                  {isAdmin ? (
                    <p className="m-0 flex h-10 items-center text-muted-foreground">{t("form.assignments.adminRow")}</p>
                  ) : (
                    <Select
                      value={row.department}
                      disabled={disabled}
                      onValueChange={(value) => form.setValue(`memberships.${index}.department`, value, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })}
                    >
                      <SelectTrigger className="w-full" aria-label={t("form.assignments.department")} aria-invalid={rowErrors?.department ? true : undefined}>
                        <SelectValue placeholder={t("form.assignments.pickDepartment")} />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((department) => (
                          <SelectItem key={department} value={department} disabled={taken.has(department) && row.department !== department}>
                            {t(`departments.${department}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {rowErrors?.department?.message ? <p role="alert" className="m-0 mt-1 text-sm text-destructive">{t(rowErrors.department.message)}</p> : null}
                </td>
                <td className="pb-3 pr-3">
                  <Select value={row.role} disabled={disabled} onValueChange={(value) => setRole(index, value)}>
                    <SelectTrigger className="w-full" aria-label={t("form.assignments.role")} aria-invalid={rowErrors?.role ? true : undefined}>
                      <SelectValue placeholder={t("form.assignments.pickRole")} />
                    </SelectTrigger>
                    <SelectContent>
                      {["Manager", "Worker", ...(fields.length === 1 ? ["Admin"] : [])].map((role) => (
                        <SelectItem key={role} value={role}>
                          {t(`roles.${role}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {rowErrors?.role?.message ? <p role="alert" className="m-0 mt-1 text-sm text-destructive">{t(rowErrors.role.message)}</p> : null}
                </td>
                <td className="pb-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 text-slate-600"
                    aria-label={`${t("form.assignments.remove")} ${index + 1}`}
                    disabled={disabled || fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2Icon />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rootMessage ? <p role="alert" className="m-0 text-sm text-destructive">{t(rootMessage)}</p> : null}
      <div>
        <Button type="button" variant="outline" disabled={disabled || hasAdmin || taken.size >= DEPARTMENTS.length} onClick={() => append({ department: "", role: "Worker" })}>
          <PlusIcon aria-hidden="true" /> {t("form.assignments.add")}
        </Button>
      </div>
    </div>
  );
}
