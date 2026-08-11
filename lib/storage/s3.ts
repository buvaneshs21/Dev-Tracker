import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { StorageDriver } from "./index";

/** How long a download link stays valid. Long enough to click, short enough
 *  that a leaked URL is worthless within the minute. */
const SIGNED_URL_TTL_SECONDS = 60;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Fail loudly at first use rather than writing files nowhere.
    throw new Error(`${name} is required when STORAGE_DRIVER=s3`);
  }
  return value;
}

let cached: S3Client | null = null;

function client(): S3Client {
  if (cached) return cached;

  cached = new S3Client({
    region: process.env.S3_REGION ?? "auto",
    // Set for Cloudflare R2, MinIO, Backblaze B2 and friends; omit for AWS.
    endpoint: process.env.S3_ENDPOINT || undefined,
    // R2 and MinIO need path-style addressing.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    },
  });

  return cached;
}

/** Keys are generated, never derived from user input. */
function buildKey(fileName: string): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");

  const extension = fileName.includes(".")
    ? fileName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "bin";

  return `${now.getFullYear()}/${month}/${randomUUID()}.${extension || "bin"}`;
}

/**
 * S3-compatible object storage — AWS S3, Cloudflare R2, MinIO, B2.
 *
 * The bucket must stay **private**. Nothing here makes objects public; reads go
 * through short-lived presigned URLs handed out only after the request has been
 * authorised against the owning task.
 */
export const s3StorageDriver: StorageDriver = {
  name: "s3",

  async put({ body, fileName, mimeType }) {
    const key = buildKey(fileName);

    await client().send(
      new PutObjectCommand({
        Bucket: required("S3_BUCKET"),
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );

    return { key };
  },

  async get(key) {
    const result = await client().send(
      new GetObjectCommand({ Bucket: required("S3_BUCKET"), Key: key }),
    );

    if (!result.Body) throw new Error("Object has no body");

    return Buffer.from(await result.Body.transformToByteArray());
  },

  async remove(key) {
    // S3 delete is already idempotent — a missing key is not an error.
    await client().send(
      new DeleteObjectCommand({ Bucket: required("S3_BUCKET"), Key: key }),
    );
  },

  async signedUrl(key, { download, fileName, mimeType }) {
    const safeName = fileName.replace(/["\r\n]/g, "");

    return getSignedUrl(
      client(),
      new GetObjectCommand({
        Bucket: required("S3_BUCKET"),
        Key: key,
        // Carried on the signed URL so the browser still renders images inline
        // and saves documents with their real name.
        ResponseContentType: mimeType,
        ResponseContentDisposition: `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      }),
      { expiresIn: SIGNED_URL_TTL_SECONDS },
    );
  },
};
