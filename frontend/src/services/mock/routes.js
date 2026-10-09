import { EMPTY_SEED } from "./seedMode.js";
import { buildDashboard } from "./dashboard.js";
import { INTERNAL_TOKEN, login, requireAdmin, toPublicUser, userFromAuthorization, usersRoutes } from "./users.js";
import { masterDataRoutes } from "./masterData.js";
import { factoryRoutes } from "./factory.js";
import { purchaseRoutes } from "./purchase.js";
import { saleRoutes } from "./sale.js";
import { accountingRoutes } from "./accounting.js";
import { serialRoutes } from "./serial.js";
import { createLedger, stockRoutes } from "./stock.js";

// Local stand-in for the backend while it does not exist yet (VITE_USE_MOCK=true).
// The data below is demo-only; replace these handlers with the real API later.


/** Any signed-in user. */
const requireUser = userFromAuthorization;

let masterStore = null;
let saleStore = null;
let factoryStore = null;
// the stock ledger: Factory and Sale book into it, the Stock pages read it (docs/specs/f8-stock.md)
const ledger = createLedger(() => masterStore);
let stockModule = null;
let purchaseStore = null;
let accountingStore = null;
let serialModule = null;

// Real documents use master records: a customer of a quotation, a product of a work order, an operator of a step ...
// (the delete of a used record is refused, 409 IN_USE)
function usedBySale(kind, id) {
  if (!saleStore) return false;
  if (kind === "customer") return [saleStore.quotations, saleStore.orders, saleStore.customerPos, saleStore.deliveries].some((rows) => rows?.some((row) => row.customerId === id));
  if (kind === "product") return [saleStore.quotations, saleStore.orders].some((rows) => rows?.some((row) => row.lines.some((line) => line.productId === id)));
  if (kind === "employee") return [saleStore.quotations, saleStore.orders].some((rows) => rows?.some((row) => row.salesPersonId === id));
  return false;
}
function usedByFactory(kind, id) {
  if (!factoryStore) return false;
  if (kind === "product") return factoryStore.workOrders.some((wo) => wo.productId === id);
  if (kind === "machine") return factoryStore.workOrders.some((wo) => wo.steps.some((step) => step.machineId === id));
  if (kind === "employee") return factoryStore.workOrders.some((wo) => wo.steps.some((step) => step.operatorId === id));
  return false;
}

export const mockRoutes = {
  "POST /auth/login": ({ body }) => login(body),

  // The Admin pages for users (docs/specs/f11-users.md)
  ...usersRoutes(),

  "GET /auth/me": ({ authorization }) => toPublicUser(userFromAuthorization(authorization)),

  "POST /auth/logout": () => null,

  "GET /dashboard": ({ authorization }) =>
    buildDashboard(userFromAuthorization(authorization), ledger, () => masterStore?.materials ?? [], () => purchaseStore, () => accountingStore, (key, query) => mockRoutes[key]({ authorization: INTERNAL_TOKEN, body: {}, params: {}, query })),

  // Master data is maintained by Admin only (F3 spec, Q6/Q7).
  ...masterDataRoutes(
    requireAdmin,
    requireUser,
    (store) => {
      masterStore = store;
    },
    (kind, id) =>
      usedBySale(kind, id) ||
      usedByFactory(kind, id) ||
      ledger.movements.some((move) => (kind === "warehouse" ? move.warehouseId === id : move.itemType === kind && move.itemId === id)) ||
      Boolean(accountingStore?.inUse(kind, id)) ||
      Boolean(purchaseStore?.orders.some((po) => (kind === "supplier" ? po.supplierId === id : kind === "material" ? po.lines.some((line) => line.materialId === id) : kind === "warehouse" ? po.warehouseId === id : false))),
  ),

  // Sale documents: Sale department members and Admin (the role decides what they may press).
  ...saleRoutes({
    userFromAuthorization,
    getStore: () => masterStore,
    onSale: (store) => {
      saleStore = store;
    },
    getWorkOrders: () => factoryStore?.workOrders ?? [],
    getAccounting: () => accountingStore,
    getSerials: () => serialModule,
    ledger,
  }),

  // Serial numbers of the finished products (docs/specs/f12-requirements-2.md). They read the Work Orders, transfers, delivery
  // notes and invoices when they are asked (the seed runs after all of them are built). Their routes come before the Factory
  // ones because /factory/work-orders/:id/serials must not be taken for a status action.
  ...(() => {
    serialModule = serialRoutes({ userFromAuthorization, getStore: () => masterStore, getFactory: () => factoryStore, getSale: () => saleStore, getPurchase: () => purchaseStore, getAccounting: () => accountingStore });
    return serialModule.routes;
  })(),

  // Factory documents: Factory department members and Admin. They read the sale orders that were sent to the factory.
  ...factoryRoutes({
    userFromAuthorization,
    getStore: () => masterStore,
    getSale: () => saleStore,
    onFactory: (store) => {
      factoryStore = store;
    },
    ledger,
  }),

  // Purchase: Purchase department members and Admin. Its receipts book into the stock ledger.
  ...purchaseRoutes({
    userFromAuthorization,
    getStore: () => masterStore,
    ledger,
    onPurchase: (store) => {
      purchaseStore = store;
    },
    getAccounting: () => accountingStore,
  }),

  // Accounting: Accounting department members and Admin. It reads the delivered delivery notes and the posted goods receipts.
  ...accountingRoutes({
    userFromAuthorization,
    getStore: () => masterStore,
    getSale: () => saleStore,
    getPurchase: () => purchaseStore,
    onAccounting: (store) => {
      accountingStore = store;
    },
  }),

  // The seed of the serial numbers needs every module above, so it runs here.
  ...(() => {
    if (!EMPTY_SEED) serialModule.seed();
    return {};
  })(),

  // Stock: Factory and Purchase users and Admin. Built last: its opening balances make the sum of the movements that
  // the seeded Work Orders, transfers and deliveries booked end on the numbers of the demo.
  ...(() => {
    stockModule = stockRoutes({ userFromAuthorization, getStore: () => masterStore, ledger });
    if (EMPTY_SEED) ledger.finishSeed();
    else stockModule.seedOpening();
    return stockModule.routes;
  })(),
};
