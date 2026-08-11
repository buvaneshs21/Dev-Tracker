import mongoose from "mongoose";
import dns, { Resolver } from "node:dns/promises";

// Codes that mean "the resolver never answered", as opposed to "the resolver
// answered and the name does not exist". Conflating these two is the whole
// reason this script used to misdiagnose failures.
const RESOLVER_DOWN = ["ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "ESERVFAIL"];
const PUBLIC_DNS = ["8.8.8.8", "1.1.1.1"];

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error(
    "[FAIL] MONGO_URI is not set. Run with: npm run db:check",
  );
  process.exit(1);
}

const masked = uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
console.log("[INFO] Connecting to:", masked);

// ---------------------------------------------------------------------------
// Parse the URI far enough to know what to resolve. `new URL()` mangles the
// comma-separated seed-list form, so pull the host section out by hand.
// ---------------------------------------------------------------------------
function parseHosts(connectionString) {
  const m = /^(mongodb(?:\+srv)?):\/\/(?:[^@/]*@)?([^/?]+)/.exec(
    connectionString,
  );
  if (!m) return null;
  return {
    isSrv: m[1] === "mongodb+srv",
    hosts: m[2]
      .split(",")
      .map((h) => h.trim().split(":")[0])
      .filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// DNS pre-flight. A dead cluster and a blocked IP produce the same generic
// Mongoose message, so resolve the names ourselves first — that difference is
// the whole diagnosis.
//
// Two lookups per host. The first uses getaddrinfo (seed-list) or the system
// resolver (SRV), which is the path the driver itself takes. If that fails we
// retry against public DNS, because only a real answer from a reachable
// resolver can distinguish "this name is gone" from "no resolver replied".
// ---------------------------------------------------------------------------
function publicResolver() {
  const r = new Resolver();
  r.setServers(PUBLIC_DNS);
  return r;
}

async function probeHost(host, isSrv) {
  const name = isSrv ? `_mongodb._tcp.${host}` : host;

  try {
    if (isSrv) {
      const records = await dns.resolveSrv(name);
      return {
        name,
        ok: true,
        detail: `${records.length} record(s): ${records
          .map((r) => `${r.name}:${r.port}`)
          .join(", ")}`,
      };
    }
    const { address } = await dns.lookup(host);
    return { name, ok: true, detail: address };
  } catch (e) {
    var primaryCode = e.code ?? e.message;
  }

  try {
    const r = publicResolver();
    if (isSrv) {
      const records = await r.resolveSrv(name);
      return {
        name,
        ok: true,
        viaPublic: true,
        primaryCode,
        detail: `${records.length} record(s): ${records
          .map((rec) => `${rec.name}:${rec.port}`)
          .join(", ")}`,
      };
    }
    const addrs = await r.resolve4(host);
    return {
      name,
      ok: true,
      viaPublic: true,
      primaryCode,
      detail: addrs.join(", "),
    };
  } catch (e2) {
    return { name, ok: false, primaryCode, publicCode: e2.code ?? e2.message };
  }
}

async function checkDns(parsed) {
  if (!parsed || parsed.hosts.length === 0) {
    console.log("[INFO] Could not parse hosts from URI; skipping DNS check.");
    return { checked: false, verdict: "skipped" };
  }

  const results = [];
  for (const host of parsed.hosts) {
    const res = await probeHost(host, parsed.isSrv);
    results.push(res);

    if (res.ok && res.viaPublic) {
      console.log(
        `[WARN] DNS ${res.name} -> ${res.detail} (system resolver failed with ` +
          `${res.primaryCode}; answered by ${PUBLIC_DNS[0]})`,
      );
    } else if (res.ok) {
      console.log(`[OK]   DNS ${res.name} -> ${res.detail}`);
    } else {
      console.error(
        `[FAIL] DNS ${res.name} -> system: ${res.primaryCode}, ` +
          `public: ${res.publicCode}`,
      );
    }
  }

  const failures = results.filter((r) => !r.ok);
  let verdict = "ok";
  if (failures.length > 0) {
    if (failures.every((f) => f.publicCode === "ENOTFOUND")) {
      verdict = "nxdomain";
    } else if (failures.every((f) => RESOLVER_DOWN.includes(f.publicCode))) {
      verdict = "resolver-unreachable";
    } else {
      verdict = "mixed";
    }
  } else if (results.some((r) => r.viaPublic)) {
    verdict = "local-resolver-broken";
  }

  return { checked: true, verdict, allFailed: failures.length === results.length };
}

function reportResolverUnreachable() {
  console.error(
    "       Cause: No DNS resolver answered — not your system resolver, and not",
  );
  console.error(
    `              public DNS (${PUBLIC_DNS.join(", ")}). Nothing can be concluded`,
  );
  console.error("              about whether the cluster still exists.");
  console.error(
    "       Fix:   Check VPN/firewall — outbound UDP 53 is likely blocked. Retry",
  );
  console.error("              once DNS works, then re-read this diagnosis.");
}

function reportLocalResolverBroken() {
  console.error(
    "       Note:  Your system resolver failed but public DNS answered. The",
  );
  console.error(
    "              names exist. Try flushing DNS (ipconfig /flushdns) or",
  );
  console.error("              switching resolvers.");
}

function reportDeadDns(parsed) {
  console.error(
    "       Cause: The hostname(s) do not exist in public DNS (NXDOMAIN).",
  );
  console.error(
    "              This is NOT an IP allowlist problem. A blocked IP still",
  );
  console.error(
    "              resolves and then times out; a name that does not resolve",
  );
  console.error(
    "              means the cluster was deleted/terminated, or the hostname",
  );
  console.error("              in MONGO_URI is wrong.");
  console.error(
    "       Fix:   Atlas -> Database. If the cluster is listed, copy a fresh",
  );
  console.error(
    "              connection string from Connect (the cluster hash may have",
  );
  console.error(
    "              changed). If it is not listed, recreate it. Note that free",
  );
  console.error(
    "              M0 clusters pause after 60 days idle and are terminated",
  );
  console.error("              after further inactivity.");
  if (parsed?.isSrv) {
    console.error(
      "       Note:  A paused (not deleted) cluster keeps its DNS records, so",
    );
    console.error(
      "              it fails at handshake rather than at SRV lookup.",
    );
  }
}

// ---------------------------------------------------------------------------
// Pull the real underlying errors out of a MongooseServerSelectionError.
// The useful code lives at reason.servers[*].error.cause — both the top-level
// error and the per-server error report `code: undefined`.
// ---------------------------------------------------------------------------
function collectCauses(err) {
  const servers = err?.reason?.servers;
  if (!servers || typeof servers[Symbol.iterator] !== "function") return [];

  const causes = [];
  for (const [address, desc] of servers) {
    const inner = desc?.error;
    if (!inner) continue;
    const root = inner.cause ?? inner;
    causes.push({
      address,
      code: root.code ?? inner.code,
      syscall: root.syscall ?? inner.syscall,
      message: root.message ?? inner.message ?? "",
    });
  }
  return causes;
}

function diagnose(err, parsed, dnsVerdict) {
  const causes = collectCauses(err);
  const text = `${err?.message ?? ""} ${causes.map((c) => c.message).join(" ")}`;
  const has = (...codes) =>
    causes.some((c) => codes.includes(c.code)) || codes.includes(err?.code);

  if (/Authentication failed|bad auth/i.test(text)) {
    console.error(
      "       Cause: Wrong username or password (or the user lacks access to the DB in the URI).",
    );
    console.error(
      "       Fix:   Atlas -> Database Access -> verify user, then URL-encode special chars in the password.",
    );
    return;
  }

  if (
    err?.syscall === "querySrv" ||
    causes.some((c) => c.syscall === "querySrv") ||
    /querySrv/.test(text)
  ) {
    if (has("ENOTFOUND", "NXDOMAIN")) {
      if (dnsVerdict === "resolver-unreachable") {
        reportResolverUnreachable();
      } else {
        reportDeadDns(parsed);
      }
    } else {
      console.error(
        "       Cause: SRV lookup failed on this machine (resolver refused or unreachable).",
      );
      console.error(
        "       Fix:   Replace mongodb+srv:// with the non-SRV mongodb:// seed-list URI.",
      );
    }
    return;
  }

  if (has("ENOTFOUND")) {
    // getaddrinfo ENOTFOUND alone does not prove the name is gone — on some
    // systems it also surfaces when no resolver replied. Defer to the
    // pre-flight, which asked public DNS directly.
    if (dnsVerdict === "resolver-unreachable") {
      reportResolverUnreachable();
    } else if (dnsVerdict === "ok" || dnsVerdict === "local-resolver-broken") {
      console.error(
        "       Cause: The driver could not resolve a host that the pre-flight",
      );
      console.error(
        "              did resolve — likely a stale DNS cache in this process.",
      );
    } else {
      reportDeadDns(parsed);
    }
    return;
  }

  if (has("EAI_AGAIN")) {
    console.error(
      "       Cause: DNS lookup timed out — your resolver is not answering.",
    );
    console.error(
      "       Fix:   Check your network/VPN, or try a public resolver (8.8.8.8).",
    );
    return;
  }

  if (has("ETIMEDOUT") || /timed out|timeout/i.test(text)) {
    console.error(
      "       Cause: Hostnames resolve but connections time out — this is the",
    );
    console.error(
      "              signature of an IP allowlist block or an egress firewall.",
    );
    console.error(
      "       Fix:   Atlas -> Network Access -> Add IP Address (or 0.0.0.0/0 for dev only).",
    );
    return;
  }

  if (has("ECONNREFUSED")) {
    console.error(
      "       Cause: Connection refused — nothing is listening on that host/port.",
    );
    console.error(
      "       Fix:   Check the port in MONGO_URI, or that a local mongod is running.",
    );
    return;
  }

  // Atlas accepts the TCP connection from a non-allowlisted IP and then kills
  // the TLS handshake with alert 80, rather than refusing or hanging. So a
  // server-sent TLS alert here means "your IP isn't on the list", NOT a client
  // TLS misconfiguration — the generic advice would send you the wrong way.
  if (
    has("ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR") ||
    /tlsv1 alert internal error|alert number 80/i.test(text)
  ) {
    console.error(
      "       Cause: The server aborted the TLS handshake (alert 80). DNS and TCP",
    );
    console.error(
      "              both succeeded, so the cluster is up and reachable — Atlas is",
    );
    console.error("              rejecting this IP.");
    console.error(
      "       Fix:   Atlas -> Network Access -> Add IP Address -> Add Current IP.",
    );
    console.error(
      "              Home broadband IPs rotate, so an entry added yesterday may",
    );
    console.error(
      "              already be stale. Use 0.0.0.0/0 for dev if you re-add it often.",
    );
    return;
  }

  if (/SSL|TLS|certificate/i.test(text)) {
    console.error("       Cause: TLS handshake failed.");
    console.error(
      "       Fix:   Check the system clock and that the ssl/tls option in the URI matches the server.",
    );
    return;
  }

  if (causes.length > 0) {
    console.error("       Underlying per-server errors:");
    for (const c of causes) {
      console.error(
        `         ${c.address}: ${c.code ?? "?"} ${c.syscall ?? ""} ${c.message}`.trimEnd(),
      );
    }
  } else {
    console.error("       No per-server detail available. Raw error:");
    console.error(`         ${err?.name}: ${err?.message}`);
  }
}

// ---------------------------------------------------------------------------

const parsed = parseHosts(uri);
const dnsResult = await checkDns(parsed);

if (dnsResult.allFailed) {
  console.error(
    "[FAIL] No host resolved. Not attempting to connect.",
  );
  if (dnsResult.verdict === "nxdomain") {
    reportDeadDns(parsed);
  } else if (dnsResult.verdict === "resolver-unreachable") {
    reportResolverUnreachable();
  } else {
    console.error(
      "       Cause: Hosts failed to resolve for differing reasons; see above.",
    );
  }
  process.exit(1);
}

if (dnsResult.verdict === "local-resolver-broken") {
  reportLocalResolverBroken();
}

const start = Date.now();
try {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log(`[OK]   TCP + handshake (${Date.now() - start}ms)`);

  const admin = mongoose.connection.db.admin();
  const ping = await admin.ping();
  console.log("[OK]   Ping response:", ping);

  const dbName = mongoose.connection.name;
  console.log(`[OK]   Active database: ${dbName}`);

  const collections = await mongoose.connection.db
    .listCollections()
    .toArray();
  if (collections.length === 0) {
    console.log("[INFO] No collections yet (this is normal on a fresh DB).");
  } else {
    console.log(
      `[OK]   Collections (${collections.length}):`,
      collections.map((c) => c.name).join(", "),
    );
  }

  const userCount = await mongoose.connection.db
    .collection("users")
    .countDocuments();
  console.log(`[OK]   users collection: ${userCount} document(s)`);

  await mongoose.disconnect();
  console.log("[OK]   Disconnected cleanly. MongoDB is working.");
  process.exit(0);
} catch (err) {
  const ms = Date.now() - start;
  console.error(`[FAIL] After ${ms}ms: ${err.message}`);
  diagnose(err, parsed, dnsResult.verdict);
  process.exit(1);
}
