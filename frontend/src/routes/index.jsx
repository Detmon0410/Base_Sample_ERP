import { Route, Routes } from "react-router";

import { NAV_ITEMS } from "@/config/navigation";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { CustomersPage } from "@/pages/master/CustomersPage";
import { InvoicesPage } from "@/pages/invoices/InvoicesPage";
import { OrdersPage } from "@/pages/orders/OrdersPage";
import { QtPage } from "@/pages/qt/QtPage";
import { ProductsPage } from "@/pages/master/ProductsPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { StockPage } from "@/pages/stock/StockPage";
import { UsersPage } from "@/pages/users/UsersPage";
import { ForbiddenPage } from "@/pages/system/ForbiddenPage";
import { NotFoundPage } from "@/pages/system/NotFoundPage";
import { UnderConstructionPage } from "@/pages/system/UnderConstructionPage";

import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";
import { RequirePermission } from "./RequirePermission";

// Menu entries whose page is built (the key of config/navigation.js). Everything else opens the "not built yet" placeholder.
// Each module of docs/specs/s1-mini-erp-workflow.md adds its pages here.
const IMPLEMENTED_PAGES = { dashboard: DashboardPage, qt: QtPage, invoices: InvoicesPage, productionOrders: OrdersPage, customers: CustomersPage, products: ProductsPage, stock: StockPage, users: UsersPage };

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
              <Route key={item.key} element={<RequirePermission roles={item.roles} />}>
                {item.to === "/" ? <Route index element={<Page />} /> : <Route path={`${item.to.slice(1)}/*`} element={<Page />} />}
              </Route>
            );
          })}

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
