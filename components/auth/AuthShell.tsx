import { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

const highlights = [
  "Track every task from idea to shipped",
  "See your progress at a glance",
  "Built for focus, not for busywork",
];

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Brand panel — hidden on small screens so the form gets the room. */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-indigo-600 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-lg font-bold backdrop-blur">
            D
          </div>
          <span className="text-lg font-semibold tracking-tight">DevTrack</span>
        </Link>

        <div className="relative z-10">
          <h2 className="max-w-sm text-3xl leading-tight font-semibold tracking-tight">
            Ship with clarity, one task at a time.
          </h2>

          <ul className="mt-8 space-y-3.5">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-indigo-50">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-200" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-indigo-200">
          © {new Date().getFullYear()} DevTrack
        </p>
      </aside>

      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2.5 lg:hidden"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-lg font-bold text-white">
              D
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              DevTrack
            </span>
          </Link>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</p>
        </div>
      </div>
    </main>
  );
}
