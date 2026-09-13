/**
 * Whether a thrown error is "the database isn't reachable" rather than a bug.
 *
 * Mongoose reports this two ways depending on timing: a buffering timeout when
 * a query was queued against a connection that never arrived, and a server
 * selection error when the driver couldn't reach the cluster at all. Both are
 * environmental — a paused cluster, a rotated IP, a dropped Wi-Fi link — and a
 * generic "Something went wrong" sends people hunting through application code
 * for a problem that isn't there.
 */
export function isDatabaseUnreachable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  return (
    err.name === "MongooseServerSelectionError" ||
    err.name === "MongoNetworkError" ||
    /buffering timed out/i.test(err.message) ||
    /failed to connect|server selection/i.test(err.message)
  );
}

/** Safe to show a user: names the cause, reveals nothing about the cluster. */
export const DATABASE_UNREACHABLE =
  "Can't reach the database right now. Check your connection and try again.";
