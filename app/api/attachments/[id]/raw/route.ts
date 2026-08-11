import { guardTask, serverError } from "@/lib/task-guard";
import { connectDB } from "@/lib/mongodb";
import { findAttachment, readAttachment } from "@/lib/attachments";
import { storage } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };

/** Types safe to render in the browser. Everything else is forced to download. */
const INLINE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
]);

/**
 * Serves an attachment's bytes.
 *
 * This route is the reason files live outside `public/`: every request is
 * authorised against the owning task, so a URL alone grants nothing. It's the
 * local-storage equivalent of a signed download URL — with an S3 driver this
 * would redirect to a short-lived presigned GET instead.
 */
export async function GET(req: Request, { params }: Context) {
  try {
    const { id } = await params;

    await connectDB();

    // Metadata first: authorisation must happen before any bytes are fetched.
    const record = await findAttachment(id);
    if (!record?.storageKey) {
      return Response.json({ error: "Attachment not found" }, { status: 404 });
    }

    const guard = await guardTask(String(record.taskId), { write: false });
    if (!guard.ok) return guard.response;

    const mimeType = record.mimeType ?? "application/octet-stream";
    const fileName = record.fileName ?? "file";

    // ?download=1 forces a save even for previewable types.
    const forceDownload = new URL(req.url).searchParams.get("download") === "1";
    const inline = INLINE_TYPES.has(mimeType) && !forceDownload;

    // Object stores can serve the bytes themselves. The permission check above
    // already passed; the signed URL is short-lived and specific to this key,
    // so a 100 MB video never travels through the function.
    if (storage.signedUrl) {
      const url = await storage.signedUrl(record.storageKey, {
        download: !inline,
        fileName,
        mimeType,
      });

      return Response.redirect(url, 302);
    }

    const loaded = await readAttachment(id);
    if (!loaded) {
      return Response.json({ error: "Attachment not found" }, { status: 404 });
    }

    return new Response(new Uint8Array(loaded.body), {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(loaded.body.byteLength),
        // The filename is quoted and stripped of quotes/newlines so it can't
        // break out of the header.
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileName.replace(/["\r\n]/g, "")}"`,
        // Private: the response is user-specific, so no shared cache may keep it.
        "Cache-Control": "private, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return serverError("attachment raw GET", err);
  }
}
