import mongoose from "mongoose";

/**
 * One shared connection, safely.
 *
 * The naive version — `if (readyState === 1) return; await connect()` — has two
 * failure modes that both surface as `Operation "x" buffering timed out after
 * 10000ms`, which reads like a database problem and isn't:
 *
 *  1. **No in-flight guard.** Several concurrent requests each see "not
 *     connected" and each call `connect()`. On a cold start that's a handful of
 *     simultaneous handshakes racing each other.
 *
 *  2. **No recovery.** Once a live connection drops — a laptop sleeping, an
 *     Atlas failover, a rotated IP — nothing re-establishes it. Every later
 *     query is buffered by Mongoose and thrown away ten seconds later. Only a
 *     restart fixes it, which is why a fresh script always looked healthy while
 *     the running server stayed broken.
 *
 * Caching the promise fixes the first; dropping a *stale* promise fixes the
 * second. The cache lives on globalThis so Next's dev hot-reload, which
 * re-evaluates this module, doesn't lose track of the connection it already has.
 */

type ConnectionCache = { promise: Promise<typeof mongoose> | null };

const globalForMongoose = globalThis as unknown as {
  __devtrackMongoose?: ConnectionCache;
};

const cache: ConnectionCache = (globalForMongoose.__devtrackMongoose ??= {
  promise: null,
});

/** 0 disconnected · 1 connected · 2 connecting · 3 disconnecting */
const state = () => mongoose.connection.readyState;

export const connectDB = async (): Promise<typeof mongoose> => {
  if (state() === 1) return mongoose;

  // Disconnected, but holding a promise from a connection that has since died:
  // awaiting it would resolve instantly and leave every query buffering. Drop
  // it and dial again. (readyState 2 is a connect already in flight — keep it.)
  if (state() !== 2 && cache.promise) cache.promise = null;

  cache.promise ??= mongoose
    .connect(process.env.MONGO_URI!, {
      // Without this the driver waits out its 30s default before giving up, so
      // a blocked IP or a paused cluster turns every request into a 30s hang
      // before the 500. Fail fast and surface the real error instead.
      serverSelectionTimeoutMS: 8000,
    })
    .catch((err: unknown) => {
      // Never leave a rejected promise in the cache. It would resolve instantly
      // for every subsequent request with the original error, so one failed
      // attempt would permanently break the process.
      cache.promise = null;
      throw err;
    });

  return cache.promise;
};
