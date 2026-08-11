import { guardTask, serverError } from "@/lib/task-guard";
import { createAttachment, getAttachments } from "@/lib/attachments";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  try {
    const { id } = await params;
    const guard = await guardTask(id, { write: false });
    if (!guard.ok) return guard.response;

    return Response.json({ attachments: await getAttachments(id) });
  } catch (err) {
    return serverError("attachments GET", err);
  }
}

/**
 * Multipart upload.
 *
 * With local storage the server *is* the upload boundary, so authorisation,
 * type and size checks all happen here before anything is written. An S3 driver
 * would instead return a presigned URL from this same guarded point — the
 * checks wouldn't move, only where the bytes go.
 */
export async function POST(req: Request, { params }: Context) {
  try {
    const { id } = await params;
    const guard = await guardTask(id, { write: true });
    if (!guard.ok) return guard.response;

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file was uploaded" }, { status: 400 });
    }

    const result = await createAttachment(
      id,
      guard.projectId,
      guard.userId,
      file,
    );

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(
      { attachment: result.value, attachments: await getAttachments(id) },
      { status: 201 },
    );
  } catch (err) {
    return serverError("attachments POST", err);
  }
}
