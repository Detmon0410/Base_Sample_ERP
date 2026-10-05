import { Route, Routes } from "react-router";

import { SIMPLE_MASTERS } from "@/config/simpleMaster";

import { SimpleFormPage } from "./SimpleFormPage";
import { SimpleListPage } from "./SimpleListPage";

/**
 * A flat master data entity: the list is always shown; /new and /:id open the form in a sheet on
 * the right, on top of the list.
 */
export function SimpleMasterPage({ entityKey }) {
  const entity = SIMPLE_MASTERS[entityKey];
  return (
    <>
      <SimpleListPage entity={entity} />
      <Routes>
        <Route path="new" element={<SimpleFormPage entity={entity} />} />
        <Route path=":id" element={<SimpleFormPage entity={entity} />} />
      </Routes>
    </>
  );
}

export const UomPage = () => <SimpleMasterPage entityKey="uom" />;
export const WarehousesPage = () => <SimpleMasterPage entityKey="warehouses" />;
export const MachinesPage = () => <SimpleMasterPage entityKey="machines" />;
export const EmployeesPage = () => <SimpleMasterPage entityKey="employees" />;
