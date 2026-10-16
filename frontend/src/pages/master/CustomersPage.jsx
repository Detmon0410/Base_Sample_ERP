import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Route, Routes } from "react-router";

import { RecordFormPage } from "@/components/common/RecordFormPage";
import { RecordList } from "@/components/common/RecordList";
import { Section, TextField } from "@/components/common/FormFields";
import { useAuth } from "@/hooks/useAuth";
import { RequirePermission } from "@/routes/RequirePermission";
import { customersApi } from "@/services/master.service";
import { can } from "@/utils/permissions";

const EMPTY = { name: "", address: "", email: "", telephone: "" };

function CustomerForm() {
  const { t } = useTranslation("master");
  const { user } = useAuth();
  const readOnly = !can(user, "customers.write"); // a Sale Worker only looks
  return (
    <RecordFormPage
      api={customersApi}
      listPath="/master/customers"
      newTitle={t("customers.new")}
      titleOf={(record) => record.name}
      defaults={EMPTY}
      readOnly={readOnly}
      toForm={(record) => ({ name: record.name, address: record.address, email: record.email, telephone: record.telephone })}
      toBody={(values) => values}
    >
      {({ form }) => {
        const errors = form.formState.errors;
        return (
          <Section icon={Users} title={t("customers.section")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label={t("customers.name")} placeholder={t("examples:customerName")} error={errors.name?.message} disabled={readOnly} className="sm:col-span-2" {...form.register("name")} />
              <TextField label={t("customers.address")} placeholder={t("examples:customerAddress")} error={errors.address?.message} disabled={readOnly} className="sm:col-span-2" {...form.register("address")} />
              <TextField label={t("customers.email")} placeholder={t("examples:customerEmail")} type="email" error={errors.email?.message} disabled={readOnly} {...form.register("email")} />
              <TextField label={t("customers.telephone")} placeholder={t("examples:telephone")} type="tel" error={errors.telephone?.message} disabled={readOnly} {...form.register("telephone")} />
            </div>
          </Section>
        );
      }}
    </RecordFormPage>
  );
}

/** Customers: the list, a new customer, one customer. The Admin changes them; a Sale Worker only looks. */
export function CustomersPage() {
  const { t } = useTranslation("master");
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
            api={customersApi}
            base="/master/customers"
            title={t("customers.title")}
            canCreate={can(user, "customers.write")}
            newLabel={t("customers.new")}
            columns={[
              { key: "name", header: t("customers.name") },
              { key: "address", header: t("customers.address") },
              { key: "email", header: t("customers.email") },
              { key: "telephone", header: t("customers.telephone") },
            ]}
          />
        }
      />
      <Route element={<RequirePermission action="customers.write" />}>
        <Route path="new" element={<CustomerForm />} />
      </Route>
      <Route path=":id" element={<CustomerForm />} />
    </Routes>
  );
}
