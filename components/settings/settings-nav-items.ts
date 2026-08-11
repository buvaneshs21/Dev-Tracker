import {
  Bell,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  User,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export type SettingsNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Separated visually and coloured red. */
  danger?: boolean;
};

export const SETTINGS_NAV: SettingsNavItem[] = [
  { title: "Profile", href: "/settings/profile", icon: User },
  { title: "Account", href: "/settings/account", icon: UserCog },
  { title: "Appearance", href: "/settings/appearance", icon: Palette },
  { title: "Notifications", href: "/settings/notifications", icon: Bell },
  { title: "Security", href: "/settings/security", icon: ShieldCheck },
  {
    title: "Preferences",
    href: "/settings/preferences",
    icon: SlidersHorizontal,
  },
  {
    title: "Danger Zone",
    href: "/settings/danger",
    icon: TriangleAlert,
    danger: true,
  },
];
