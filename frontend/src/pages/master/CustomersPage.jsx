import { useTranslation } from "react-i18next";
import { Route, Routes } from "react-router";

import { RecordFormPage } from "@/components/common/RecordFormPage";
import { RecordList } from "@/components/common/RecordList";
import { Section, TextField } from "@/components/common/FormFields";
import { customersApi } from "@/services/master.service";

const EMPTY = { name: "", address: "", email: "", telephone: "" };

function CustomerForm() {
  const { t } = useTranslation("master");
  return (
    <RecordFormPage
      api={customersApi}
      listPath="/customers"
      newTitle={t("customers.new")}
      titleOf={(record) => record.name}
      defaults={EMPTY}
      toForm={(record) => ({ name: record.name, address: record.address, email: record.email, telephone: record.telephone })}
      toBody={(values) => values}
    >
      {({ form }) => {
        const errors = form.formState.errors;
        return (
          <Section title={t("customers.section")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label={t("customers.name")} error={errors.name?.message} className="sm:col-span-2" {...form.register("name")} />
              <TextField label={t("customers.address")} error={errors.address?.message} className="sm:col-span-2" {...form.register("address")} />
              <TextField label={t("customers.email")} type="email" error={errors.email?.message} {...form.register("email")} />
              <TextField label={t("customers.telephone")} type="tel" error={errors.telephone?.message} {...form.register("telephone")} />
            </div>
          </Section>
        );
      }}
    </RecordFormPage>
  );
}

/** Customers (Admin): the list, a new customer, one customer. */
export function CustomersPage() {
  const { t } = useTranslation("master");
  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
            api={customersApi}
            base="/customers"
            title={t("customers.title")}
            canCreate
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
      <Route path="new" element={<CustomerForm />} />
      <Route path=":id" element={<CustomerForm />} />
    </Routes>
  );
}
