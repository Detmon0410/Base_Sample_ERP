import {
  ArrowLeftRight,
  Boxes,
  ChevronDown,
  ClipboardList,
  Database,
  Factory,
  FileText,
  LayoutDashboard,
  LayoutList,
  Package,
  ReceiptText,
  UserCog,
  Users,
  Warehouse,
} from "lucide-react";

import { cn } from "@/lib/utils";

// The icon of each entry of the menu (the `icon` of config/navigation.js). Always next to the words, so it is only decoration.
const ICONS = {
  dashboard: LayoutDashboard,
  orders: ClipboardList,
  qt: FileText,
  productionOrders: Factory,
  invoices: ReceiptText,
  master: Database,
  customers: Users,
  products: Package,
  stock: Boxes,
  stockGroup: Warehouse,
  overview: LayoutList,
  movements: ArrowLeftRight,
  users: UserCog,
  down: ChevronDown,
};

export function NavIcon({ name, className }) {
  const Icon = ICONS[name];
  return Icon ? <Icon aria-hidden="true" className={cn("size-[1.1em] shrink-0", className)} /> : null;
}
