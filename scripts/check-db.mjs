import mongoose from "mongoose";

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error(
    "[FAIL] MONGO_URI is not set. Run with: npm run db:check",
  );
  process.exit(1);
}

const masked = uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
console.log("[INFO] Connecting to:", masked);

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

  if (err.code === "ECONNREFUSED" && err.syscall === "querySrv") {
    console.error(
      "       Cause: Node's DNS resolver cannot perform SRV lookups on this machine.",
    );
    console.error(
      "       Fix:   Replace mongodb+srv:// with the non-SRV mongodb:// seed-list URI.",
    );
  } else if (err.message.includes("Authentication failed")) {
    console.error(
      "       Cause: Wrong username or password (or user lacks access to the DB in the URI).",
    );
    console.error(
      "       Fix:   Atlas -> Database Access -> verify user, then URL-encode special chars in password.",
    );
  } else if (err.message.includes("IP that isn't whitelisted")) {
    console.error(
      "       Cause: Your current public IP is not on the Atlas allowlist.",
    );
    console.error(
      "       Fix:   Atlas -> Network Access -> Add IP Address (or 0.0.0.0/0 for dev only).",
    );
  } else if (err.message.includes("getaddrinfo") || err.code === "ENOTFOUND") {
    console.error(
      "       Cause: Hostname does not resolve. Cluster may be paused or hostname is wrong.",
    );
  }

  process.exit(1);
}
