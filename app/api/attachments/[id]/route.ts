import { guardTask, serverError } from "@/lib/task-guard";
import { connectDB } from "@/lib/mongodb";
import { deleteAttachment, findAttachment } from "@/lib/attachments";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Context) {
  try {
    const { id } = await params;

    await connectDB();

    const attachment = await findAttachment(id);
    if (!attachment) {
      return Response.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Authorise against the *task* the file belongs to, not the attachment id.
    const guard = await guardTask(String(attachment.taskId), { write: true });
    if (!guard.ok) return guard.response;

    // Uploaders can remove their own file; task owners and project admins can
    // remove anyone's.
    const isUploader = String(attachment.uploadedBy) === guard.userId;
    if (!isUploader && !guard.canDelete) {
      return Response.json(
        { error: "You can only delete files you uploaded" },
        { status: 403 },
      );
    }

    const result = await deleteAttachment(id);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return serverError("attachment DELETE", err);
  }
}
