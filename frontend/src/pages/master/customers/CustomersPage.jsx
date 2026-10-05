import { Route, Routes } from "react-router";

import { CustomerFormPage } from "./CustomerFormPage";
import { CustomersListPage } from "./CustomersListPage";

/**
 * M1 Customers. The list is always shown; /new and /:id open the form in a sheet on the right,
 * on top of the list.
 */
export function CustomersPage() {
  return (
    <>
      <CustomersListPage />
      <Routes>
        <Route path="new" element={<CustomerFormPage />} />
        <Route path=":id" element={<CustomerFormPage />} />
      </Routes>
    </>
  );
}
