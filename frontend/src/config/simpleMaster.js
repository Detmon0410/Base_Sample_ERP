// Master data with only flat fields (no sub-lists): Units of measure, Warehouses, Machines / lines,
// Employees. One list page and one form page are built from these definitions
// (pages/master/simple). Entities with tabs (Suppliers, Products, Materials) have their own pages.
//
// Texts live in i18n, namespace "master", under the entity key:
//   <key>.singular / .new / .empty / .noResult
//   <key>.columns.<field>, <key>.form.section, <key>.form.fields.<field>, <key>.form.placeholders.<field>
//   <key>.options.<field>.<value>          (select fields)
//
// field.type: "text" | "number" | "select". Every entity also has code (fixed after creation),
// name and status; they are added by the pages, not listed here.

export const SIMPLE_MASTERS = {
  uom: {
    key: "uom",
    path: "/master/uom",
    nav: "items.uom",
    fields: [],
    columns: [],
    sortable: ["code", "name", "status"],
  },
  warehouses: {
    key: "warehouses",
    path: "/master/warehouses",
    nav: "items.warehouses",
    fields: [{ name: "type", type: "select", required: true, options: ["RAW_MATERIAL", "FINISHED_GOODS"] }],
    columns: [{ key: "type", kind: "option" }],
    sortable: ["code", "name", "type", "status"],
  },
  machines: {
    key: "machines",
    path: "/master/machines",
    nav: "items.machines",
    fields: [
      { name: "capacityPerDay", type: "number" },
      { name: "capacityUnit", type: "text", max: 20 },
    ],
    columns: [{ key: "capacityPerDay", kind: "quantity", unitKey: "capacityUnit" }],
    sortable: ["code", "name", "capacityPerDay", "status"],
  },
  employees: {
    key: "employees",
    path: "/master/employees",
    nav: "items.employees",
    fields: [{ name: "position", type: "text", max: 50 }],
    columns: [{ key: "position", kind: "text" }],
    sortable: ["code", "name", "position", "status"],
  },
};
