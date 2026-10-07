import { lazy } from "react";
import { Route, Routes } from "react-router";

import { NAV_GROUPS } from "@/config/navigation";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ForbiddenPage } from "@/pages/system/ForbiddenPage";
import { NotFoundPage } from "@/pages/system/NotFoundPage";
import { UnderConstructionPage } from "@/pages/system/UnderConstructionPage";

import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";
import { RequirePermission } from "./RequirePermission";

// Every page is its own file that the browser loads when the route is opened (the sign-in screen, the layout and
// the small system pages stay in the first file). MainLayout shows a short "Loading" while a page arrives.
const page = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })));
const DashboardPage = page(() => import("@/pages/dashboard/DashboardPage"), "DashboardPage");
const CustomerPosPage = page(() => import("@/pages/sale/customer-pos/CustomerPosPage"), "CustomerPosPage");
const DeliveriesPage = page(() => import("@/pages/sale/deliveries/DeliveriesPage"), "DeliveriesPage");
const OrdersPage = page(() => import("@/pages/sale/orders/OrdersPage"), "OrdersPage");
const QuotationsPage = page(() => import("@/pages/sale/quotations/QuotationsPage"), "QuotationsPage");
const CustomersPage = page(() => import("@/pages/master/customers/CustomersPage"), "CustomersPage");
const PriceListsPage = page(() => import("@/pages/master/price-lists/PriceListsPage"), "PriceListsPage");
const ProductsPage = page(() => import("@/pages/master/products/ProductsPage"), "ProductsPage");
const MaterialsPage = page(() => import("@/pages/master/materials/MaterialsPage"), "MaterialsPage");
const SuppliersPage = page(() => import("@/pages/master/suppliers/SuppliersPage"), "SuppliersPage");
const WorkOrdersPage = page(() => import("@/pages/factory/work-orders/WorkOrdersPage"), "WorkOrdersPage");
const TrackingPage = page(() => import("@/pages/factory/tracking/TrackingPage"), "TrackingPage");
const TransfersPage = page(() => import("@/pages/factory/transfers/TransfersPage"), "TransfersPage");
const StockOverviewPage = page(() => import("@/pages/stock/overview/StockOverviewPage"), "StockOverviewPage");
const StockMovementsPage = page(() => import("@/pages/stock/movements/StockMovementsPage"), "StockMovementsPage");
const AdjustmentsPage = page(() => import("@/pages/stock/adjustments/AdjustmentsPage"), "AdjustmentsPage");
const StockStatusPage = page(() => import("@/pages/purchase/stock-status/StockStatusPage"), "StockStatusPage");
const PurchaseOrdersPage = page(() => import("@/pages/purchase/orders/PurchaseOrdersPage"), "PurchaseOrdersPage");
const GoodsReceiptsPage = page(() => import("@/pages/purchase/receipts/GoodsReceiptsPage"), "GoodsReceiptsPage");
const InvoicesPage = page(() => import("@/pages/accounting/documents/MoneyDocumentsPage"), "InvoicesPage");
const BillsPage = page(() => import("@/pages/accounting/documents/MoneyDocumentsPage"), "BillsPage");
const ReceiptsPage = page(() => import("@/pages/accounting/payments/MoneyPage"), "ReceiptsPage");
const PaymentsPage = page(() => import("@/pages/accounting/payments/MoneyPage"), "PaymentsPage");
const JournalPage = page(() => import("@/pages/accounting/journal/JournalPage"), "JournalPage");
const AccountingMasterPage = page(() => import("@/pages/accounting/master/AccountingMasterPage"), "AccountingMasterPage");
const SimpleMaster = () => import("@/pages/master/simple/SimpleMasterPage");
const EmployeesPage = page(SimpleMaster, "EmployeesPage");
const MachinesPage = page(SimpleMaster, "MachinesPage");
const UomPage = page(SimpleMaster, "UomPage");
const WarehousesPage = page(SimpleMaster, "WarehousesPage");
const FoundationDemoPage = import.meta.env.DEV ? page(() => import("@/pages/dev/FoundationDemoPage"), "FoundationDemoPage") : null;
const TestComponentsPage = import.meta.env.DEV ? page(() => import("@/pages/dev/TestComponentsPage"), "TestComponentsPage") : null;

// Menu entries whose page is built. Everything else opens the "not built yet" placeholder.
const IMPLEMENTED_PAGES = {
  customers: CustomersPage,
  quotations: QuotationsPage,
  customerPos: CustomerPosPage,
  saleOrders: OrdersPage,
  deliveryNotes: DeliveriesPage,
  uom: UomPage,
  warehouses: WarehousesPage,
  machines: MachinesPage,
  employees: EmployeesPage,
  materials: MaterialsPage,
  suppliers: SuppliersPage,
  products: ProductsPage,
  priceLists: PriceListsPage,
  workOrders: WorkOrdersPage,
  productionTracking: TrackingPage,
  fgTransfer: TransfersPage,
  stockOverview: StockOverviewPage,
  stockMovements: StockMovementsPage,
  stockAdjustment: AdjustmentsPage,
  stockStatus: StockStatusPage,
  purchaseOrders: PurchaseOrdersPage,
  goodsReceipt: GoodsReceiptsPage,
  invoices: InvoicesPage,
  receipts: ReceiptsPage,
  bills: BillsPage,
  payments: PaymentsPage,
  journal: JournalPage,
  accountingMaster: AccountingMasterPage,
};

/**
 * Route table. Every menu entry in config/navigation.js gets a route (and a wildcard
 * for its /new and /:id pages) guarded by the group's access rule. Until a page is built
 * it renders the "not built yet" placeholder; replace the element when the page exists.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="403" element={<ForbiddenPage />} />
          {import.meta.env.DEV ? <Route path="dev/foundation" element={<FoundationDemoPage />} /> : null}
          {import.meta.env.DEV ? <Route path="dev/testcomponents" element={<TestComponentsPage />} /> : null}

          {NAV_GROUPS.map((group) => (
            <Route key={group.key} element={<RequirePermission access={group.access} />}>
              {group.items.map((item) => {
                const Page = IMPLEMENTED_PAGES[item.key] ?? UnderConstructionPage;
                return <Route key={item.key} path={`${item.to.slice(1)}/*`} element={<Page />} />;
              })}
            </Route>
          ))}

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

