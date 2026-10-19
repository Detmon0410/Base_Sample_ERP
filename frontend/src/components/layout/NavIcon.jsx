import {
  ArrowLeftRight,
  Banknote,
  Boxes,
  ChevronDown,
  ClipboardList,
  Database,
  Factory,
  FileText,
  Landmark,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingCart,
  Truck,
  KeyRound,
  Network,
  Workflow,
  Route,
  Cable,
  Globe,
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
  accounting: Landmark,
  receipts: Banknote,
  master: Database,
  customers: Users,
  products: Package,
  stock: Boxes,
  stockGroup: Warehouse,
  movements: ArrowLeftRight,
  users: UserCog,
  purchase: ShoppingCart,
  suppliers: Truck,
  erDiagram: Network,
  dbRelations: KeyRound,
  flowChart: Workflow,
  userFlow: Route,
  apisDiagram: Cable,
  contextDiagram: Globe,
  down: ChevronDown,
};

export function NavIcon({ name, className }) {
  const Icon = ICONS[name];
  return Icon ? <Icon aria-hidden="true" className={cn("size-[1.1em] shrink-0", className)} /> : null;
}
