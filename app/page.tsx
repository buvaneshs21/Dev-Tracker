import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-violet-600/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-3xl" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 font-bold">
            D
          </div>
          <span className="text-lg font-semibold tracking-tight">DevTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-20 pb-32 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Built for developers, by developers
        </span>

        <h1 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl leading-[1.1] font-semibold tracking-tight text-transparent sm:text-6xl md:text-7xl">
          Track your projects.
          <br />
          Ship with clarity.
        </h1>

        <p className="mt-6 max-w-2xl text-base text-white/60 sm:text-lg">
          DevTrack is a focused workspace for tasks, milestones, and the small
          decisions that move a project forward. No clutter — just the signal.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-indigo-500/40"
          >
            Create your account
            <span className="transition group-hover:translate-x-0.5">→</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 backdrop-blur transition hover:bg-white/10"
          >
            I already have an account
          </Link>
        </div>

        <div className="mt-20 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              title: "Tasks",
              desc: "Plan, prioritize, and track without the overhead.",
            },
            {
              title: "Analytics",
              desc: "See progress trends across days and projects.",
            },
            {
              title: "Profile",
              desc: "One workspace that follows you everywhere.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              <h3 className="text-sm font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm text-white/55">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
