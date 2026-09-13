import { spawn } from "node:child_process";

/**
 * Runs the Next dev server and the realtime relay together.
 *
 * Real-time updates need two processes, and remembering to start the second
 * one in another terminal is exactly the sort of thing that gets forgotten —
 * at which point the app silently falls back to polling and looks broken in a
 * way nothing reports. One command avoids that.
 *
 * Deliberately dependency-free (no `concurrently`): spawning two children and
 * prefixing their output is a dozen lines, and this has to work on Windows.
 */

const RESET = "\x1b[0m";

const PROCESSES = [
  // `essential` decides what happens when it exits. Next dying means there is
  // no app, so everything stops. The relay dying does not — every live view
  // falls back to polling — so the app keeps running and says so instead.
  { name: "next    ", script: "dev:app", colour: "\x1b[36m", essential: true },
  { name: "realtime", script: "realtime", colour: "\x1b[35m", essential: false },
];

const children = [];
let shuttingDown = false;

function stopAll(code) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    // Windows has no process groups to signal, so kill the tree by pid.
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        shell: true,
      });
    } else {
      child.kill("SIGTERM");
    }
  }

  process.exit(code);
}

for (const { name, script, colour, essential } of PROCESSES) {
  // shell: true because `npm` is a .cmd shim on Windows.
  const child = spawn("npm", ["run", script], { shell: true });
  children.push(child);

  const prefix = (stream) => (chunk) => {
    for (const line of chunk.toString().split("\n")) {
      if (line.trim()) stream.write(`${colour}[${name}]${RESET} ${line}\n`);
    }
  };

  child.stdout.on("data", prefix(process.stdout));
  child.stderr.on("data", prefix(process.stderr));

  child.on("exit", (code) => {
    if (shuttingDown) return;

    if (essential) {
      console.log(`\n[dev:all] ${name.trim()} exited (${code}) — stopping.`);
      stopAll(code ?? 1);
      return;
    }

    // The relay is optional. Saying so here is the whole point of this
    // script: the alternative is an app that looks configured for live
    // updates, quietly falls back to a 30-second poll, and gives you only a
    // small "Syncing" indicator to work it out from.
    console.log(
      [
        "",
        "\x1b[33m[dev:all] the realtime relay stopped" +
          (code ? ` (exit ${code})` : "") + ".\x1b[0m",
        "\x1b[33m          The app keeps working — live views fall back to polling —\x1b[0m",
        "\x1b[33m          but notifications and dashboards will not update instantly.\x1b[0m",
        "\x1b[33m          Check JWT_SECRET and REALTIME_EMIT_SECRET in .env.local.\x1b[0m",
        "",
      ].join("\n"),
    );
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stopAll(0));
}
