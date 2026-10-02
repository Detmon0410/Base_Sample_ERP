import { Route, Routes } from "react-router";

import { CustomerFormPage } from "./CustomerFormPage";
import { CustomersListPage } from "./CustomersListPage";

/** M1 Customers: /master/customers (list), /new, /:id (edit). */
export function CustomersPage() {
  return (
    <Routes>
      <Route index element={<CustomersListPage />} />
      <Route path="new" element={<CustomerFormPage />} />
      <Route path=":id" element={<CustomerFormPage />} />
    </Routes>
  );
}
