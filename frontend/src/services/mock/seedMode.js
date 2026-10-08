// The workflow test (docs/specs/f13-workflow-test.md): with VITE_MOCK_SEED=empty the mock starts with no business records at
// all (no customers, products, documents, stock, journal). Only the users of each department and the settings the system
// needs to work (units, warehouses, chart of accounts, tax rate, payment methods) exist. Everything else is made by hand.
export const EMPTY_SEED = import.meta.env.VITE_MOCK_SEED === "empty";
