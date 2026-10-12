import { UserCog } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Route, Routes } from "react-router";

import { Section, SelectField, TextField } from "@/components/common/FormFields";
import { RecordFormPage } from "@/components/common/RecordFormPage";
import { RecordList } from "@/components/common/RecordList";
import { usersApi } from "@/services/master.service";
import { DEPARTMENTS, ROLES } from "@/utils/permissions";

const EMPTY = { name: "", department: "", email: "", role: "Worker", password: "" };

function UserForm() {
  const { t } = useTranslation(["master", "nav"]);
  const departments = [{ value: "", label: t("master:users.chooseDepartment") }, ...DEPARTMENTS.map((value) => ({ value, label: t(`master:users.departments.${value}`) }))];
  const roles = ROLES.map((value) => ({ value, label: t(`nav:roles.${value}`) }));
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
              <SelectField label={t("master:users.department")} options={departments} error={errors.department?.message} {...form.register("department")} />
              <SelectField label={t("master:users.role")} options={roles} error={errors.role?.message} {...form.register("role")} />
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
