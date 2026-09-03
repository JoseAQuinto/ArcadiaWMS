import type { ComponentType } from "react";
import {
  LayoutDashboard,
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  ClipboardEdit,
  Boxes,
  Package,
  MapPin,
  History,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }],
  },
  {
    label: "Operaciones",
    items: [
      { label: "Entradas", to: "/receipts", icon: PackagePlus },
      { label: "Salidas", to: "/outbound-orders", icon: PackageMinus },
      { label: "Movimientos", to: "/transfers", icon: ArrowLeftRight },
      { label: "Regularizaciones", to: "/adjustments", icon: ClipboardEdit },
    ],
  },
  {
    label: "Inventario",
    items: [
      { label: "Stock", to: "/stock", icon: Boxes },
      { label: "Artículos", to: "/items", icon: Package },
      { label: "Ubicaciones", to: "/locations", icon: MapPin },
    ],
  },
  {
    label: "Control",
    items: [{ label: "Histórico", to: "/movements", icon: History }],
  },
  {
    label: "Administración",
    items: [{ label: "Configuración", to: "/settings", icon: Settings, adminOnly: true }],
  },
];
