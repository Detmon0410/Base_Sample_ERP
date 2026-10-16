import { UserCog } from "lucide-react";
import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Route, Routes } from "react-router";

import { Section, SelectField, TextField } from "@/components/common/FormFields";
import { RecordFormPage } from "@/components/common/RecordFormPage";
import { RecordList } from "@/components/common/RecordList";
import { usersApi } from "@/services/master.service";
import { DEPARTMENTS, ROLES, WORKER_DEPARTMENTS } from "@/utils/permissions";

const EMPTY = { name: "", department: "", email: "", role: "Worker", password: "" };

/** The department and the role. A Worker is in Sales (a Sale Worker) or in Factory (a Factory Worker); the department decides the access. */
function DepartmentAndRole({ form, errors }) {
  const { t } = useTranslation(["master", "nav"]);
  const role = useWatch({ control: form.control, name: "role" });
  const department = useWatch({ control: form.control, name: "department" });
  const allowed = role === "Worker" ? WORKER_DEPARTMENTS : DEPARTMENTS;
  const departments = [{ value: "", label: t("master:users.chooseDepartment") }, ...allowed.map((value) => ({ value, label: t(`master:users.departments.${value}`) }))];
  const roles = ROLES.map((value) => ({ value, label: t(`nav:roles.${value}`) }));
  const hint = role === "Admin" ? "Admin" : department === "Sales" || department === "Factory" ? department : "Worker";
  return (
    <>
      <SelectField label={t("master:users.department")} options={departments} error={errors.department?.message} {...form.register("department")} />
      <SelectField label={t("master:users.role")} options={roles} error={errors.role?.message} {...form.register("role")} />
      <p className="text-sm text-muted-foreground sm:col-span-2">{t(`master:users.access.${hint}`)}</p>
    </>
  );
}

function UserForm() {
  const { t } = useTranslation(["master", "nav"]);
  return (
    <RecordFormPage
      api={usersApi}
      listPath="/master/users"
      newTitle={t("master:users.new")}
      titleOf={(record) => record.name}
      defaults={EMPTY}
      toForm={(record) => ({ name: record.name, department: record.department, email: record.email, role: record.role, password: "" })}
      toBody={(values) => values}
    >
      {({ form, record }) => {
        const errors = form.formState.errors;
        return (
          <Section icon={UserCog} title={t("master:users.section")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label={t("master:users.name")} error={errors.name?.message} {...form.register("name")} />
              <TextField label={t("master:users.email")} type="email" autoComplete="off" error={errors.email?.message} {...form.register("email")} />
              <DepartmentAndRole form={form} errors={errors} />
              <TextField
                label={record ? t("master:users.newPassword") : t("master:users.password")}
                type="password"
                autoComplete="new-password"
                error={errors.password?.message}
                className="sm:col-span-2"
                {...form.register("password")}
              />
              {record ? <p className="text-sm text-muted-foreground sm:col-span-2">{t("master:users.passwordHint")}</p> : null}
            </div>
          </Section>
        );
      }}
    </RecordFormPage>
  );
}

/** Users (Admin): the list, a new user, one user. A user is never deleted; the account is made inactive. */
export function UsersPage() {
  const { t } = useTranslation(["master", "nav"]);
  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
                  api={usersApi}
            base="/master/users"
            title={t("master:users.title")}
            canCreate
            newLabel={t("master:users.new")}
            columns={[
              { key: "name", header: t("master:users.name") },
              { key: "email", header: t("master:users.email") },
              { key: "department", header: t("master:users.department"), cell: (row) => t(`master:users.departments.${row.department}`) },
              { key: "role", header: t("master:users.role"), cell: (row) => t(`nav:roles.${row.role}`) },
            ]}
          />
        }
      />
      <Route path="new" element={<UserForm />} />
      <Route path=":id" element={<UserForm />} />
    </Routes>
  );
}
