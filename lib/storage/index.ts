import { localStorageDriver } from "./local";
import { s3StorageDriver } from "./s3";

/**
 * The seam between the app and wherever bytes actually live.
 *
 * Everything above this interface — services, routes, UI — only ever sees an
 * opaque `key`, so swapping drivers changes no caller.
 */
export interface StorageDriver {
  readonly name: string;

  /** Persists bytes and returns the key needed to read them back. */
  put(input: {
    body: Buffer;
    /** Only used to pick a file extension — never to build a path. */
    fileName: string;
    mimeType: string;
  }): Promise<{ key: string }>;

  get(key: string): Promise<Buffer>;

  /** Must resolve even if the object is already gone, so deletes are idempotent. */
  remove(key: string): Promise<void>;

  /**
   * Optional: a short-lived direct URL.
   *
   * Object stores can serve bytes themselves, which keeps a 100 MB video from
   * being streamed through a serverless function. Drivers without this (local
   * disk) fall back to streaming through the authenticated route. Either way
   * the permission check happens first — this is only how the bytes travel.
   */
  signedUrl?(
    key: string,
    options: { download: boolean; fileName: string; mimeType: string },
  ): Promise<string>;
}

/**
 * `STORAGE_DRIVER` selects explicitly; otherwise the presence of `S3_BUCKET`
 * decides. That way a deployment with S3 configured can't silently fall back to
 * a local disk it doesn't have, and local development needs no configuration
 * at all.
 */
function selectDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER?.toLowerCase();

  if (explicit === "s3") return s3StorageDriver;
  if (explicit === "local") return localStorageDriver;

  return process.env.S3_BUCKET ? s3StorageDriver : localStorageDriver;
}

export const storage: StorageDriver = selectDriver();
