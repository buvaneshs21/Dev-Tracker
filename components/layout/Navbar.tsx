import MobileSidebar from "./MobileSidebar";
import NavSearch from "./NavSearch";
import NotificationsMenu from "./NotificationsMenu";
import ProfileMenu from "./ProfileMenu";
import ThemeToggle from "./ThemeToggle";
import ConnectionStatus from "@/components/realtime/ConnectionStatus";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import type { NotificationFeed } from "@/lib/types";

interface NavbarProps {
  title: string;
  user: { name: string; email: string };
  defaultQuery?: string;
  /** Rendered server-side so the bell's badge is right in the first paint. */
  notifications: NotificationFeed;
  /** Whether the server has an API key. Never the key itself. */
  assistantEnabled: boolean;
}

export default function Navbar({
  title,
  user,
  defaultQuery,
  notifications,
  assistantEnabled,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-4 px-6 lg:px-8">
        <MobileSidebar />

        <h1 className="shrink-0 text-base font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h1>

        <div className="flex flex-1 justify-center px-2">
          <NavSearch defaultQuery={defaultQuery} />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ConnectionStatus />
          <AssistantLauncher enabled={assistantEnabled} />
          <NotificationsMenu initial={notifications} />
          <ThemeToggle />
          <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
          <ProfileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
