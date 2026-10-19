import { Navigate, Route, Routes, useParams } from "react-router";

import { NAV_ITEMS } from "@/config/navigation";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { CustomersPage } from "@/pages/master/CustomersPage";
import { AccountingPage } from "@/pages/accounting/AccountingPage";
import { OrdersPage } from "@/pages/orders/OrdersPage";
import { QtPage } from "@/pages/qt/QtPage";
import { PurchasePage } from "@/pages/purchase/PurchasePage";
import { SuppliersPage } from "@/pages/suppliers/SuppliersPage";
import { ProductsPage } from "@/pages/master/ProductsPage";
import { HomePage } from "@/pages/home/HomePage";
import { StockMovementsPage } from "@/pages/stock/StockMovementsPage";
import { StockPage } from "@/pages/stock/StockPage";
import { UsersPage } from "@/pages/users/UsersPage";
import { ErDiagramPage } from "@/pages/erDiagram/ErDiagramPage";
import { DbRelationsPage } from "@/pages/dbRelations/DbRelationsPage";
import { FlowChartPage } from "@/pages/flowChart/FlowChartPage";
import { UserFlowPage } from "@/pages/userFlow/UserFlowPage";
import { ApisDiagramPage } from "@/pages/apisDiagram/ApisDiagramPage";
import { ContextDiagramPage } from "@/pages/contextDiagram/ContextDiagramPage";
import { ForbiddenPage } from "@/pages/system/ForbiddenPage";
import { NotFoundPage } from "@/pages/system/NotFoundPage";
import { UnderConstructionPage } from "@/pages/system/UnderConstructionPage";

import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";
import { RequirePermission } from "./RequirePermission";

// Menu entries whose page is built (the key of config/navigation.js). Everything else opens the "not built yet" placeholder.
const IMPLEMENTED_PAGES = { dashboard: HomePage, qt: QtPage, accounting: AccountingPage, productionOrders: OrdersPage, purchase: PurchasePage, suppliers: SuppliersPage, materials: StockPage, movements: StockMovementsPage, customers: CustomersPage, products: ProductsPage, users: UsersPage, erDiagram: ErDiagramPage, dbRelations: DbRelationsPage, flowChart: FlowChartPage, userFlow: UserFlowPage, apisDiagram: ApisDiagramPage, contextDiagram: ContextDiagramPage };

/** An old address of a material, /stock/<id> (a saved link, the Dashboard of before): it opens the material where it is now. */
function LegacyMaterialRedirect() {
  const { id } = useParams();
  return /^\d+$/.test(id) ? <Navigate to={`/stock/materials/${id}`} replace /> : <NotFoundPage />;
}

// The addresses of before the pages were grouped by area (/qt, /orders, ...): a saved link opens the page where it is now.
const MOVED = { qt: "sale/quotations", orders: "sale/orders", invoices: "accounting/invoices", receipts: "accounting/receipts", customers: "master/customers", products: "master/products", users: "master/users" };

function MovedRedirect({ to }) {
  const { "*": rest } = useParams();
  return <Navigate to={`/${to}${rest ? `/${rest}` : ""}`} replace />;
}

/**
 * Route table. Every menu entry in config/navigation.js gets a route (and a wildcard for its /new and /:id pages) guarded by
 * the roles of the entry. Until a page is built it renders the "not built yet" placeholder.
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
          <Route path="403" element={<ForbiddenPage />} />

          {NAV_ITEMS.map((item) => {
            const Page = IMPLEMENTED_PAGES[item.key] ?? UnderConstructionPage;
            return (
              <Route key={item.key} element={<RequirePermission action={item.action} />}>
                {item.to === "/" ? <Route index element={<Page />} /> : <Route path={`${item.to.slice(1)}/*`} element={<Page />} />}
              </Route>
            );
          })}

          <Route element={<RequirePermission action="stock.view" />}>
            <Route path="stock" element={<Navigate to="/stock/materials" replace />} />
            <Route path="stock/:id" element={<LegacyMaterialRedirect />} />
          </Route>

          {Object.entries(MOVED).map(([from, to]) => (
            <Route key={from} path={`${from}/*`} element={<MovedRedirect to={to} />} />
          ))}

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
