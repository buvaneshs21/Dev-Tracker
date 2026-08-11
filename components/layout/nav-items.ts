import {
  BarChart3,
  Calendar,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** False for sections that aren't built yet — rendered, but not navigable,
   *  so the nav shows the product shape without handing out dead links. */
  available: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    available: true,
  },
  { title: "Tasks", href: "/tasks", icon: CheckSquare, available: true },
  { title: "Projects", href: "/projects", icon: FolderKanban, available: true },
  { title: "Calendar", href: "/calendar", icon: Calendar, available: true },
  { title: "Analytics", href: "/analytics", icon: BarChart3, available: true },
  { title: "Settings", href: "/settings", icon: Settings, available: true },
];
