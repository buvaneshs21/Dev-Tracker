import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageDriver } from "./index";

/**
 * Files live outside `public/` deliberately: anything under public/ is served
 * by the web server with no auth, which would make every attachment readable by
 * anyone who guessed a URL. These are streamed back through an authenticated
 * route instead.
 */
const ROOT = path.join(process.cwd(), "storage", "uploads");

/** Keys are generated, never derived from user input — no path traversal. */
function buildKey(fileName: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");

  const extension = fileName.includes(".")
    ? fileName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "bin";

  return `${year}/${month}/${randomUUID()}.${extension || "bin"}`;
}

/** Rejects any key that would escape ROOT, however it was constructed. */
function resolveKey(key: string): string {
  const target = path.resolve(ROOT, key);
  const root = path.resolve(ROOT);

  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error("Invalid storage key");
  }

  return target;
}

export const localStorageDriver: StorageDriver = {
  name: "local",

  async put({ body, fileName }) {
    const key = buildKey(fileName);
    const target = resolveKey(key);

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);

    return { key };
  },

  async get(key) {
    return readFile(resolveKey(key));
  },

  async remove(key) {
    try {
      await unlink(resolveKey(key));
    } catch (err) {
      // Already gone is success — the caller's goal is "it isn't there".
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  },
};
