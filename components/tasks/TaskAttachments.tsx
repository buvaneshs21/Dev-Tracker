"use client";

import { useRef, useState } from "react";
import { AlertCircle, Paperclip, Upload } from "lucide-react";

import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import AttachmentCard from "./AttachmentCard";
import AttachmentPreview from "./AttachmentPreview";
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILE_SIZE,
  checkFile,
} from "@/lib/attachment-config";
import type { AttachmentDTO } from "@/lib/types";

const MB = 1024 * 1024;

interface TaskAttachmentsProps {
  taskId: string;
  initial: AttachmentDTO[];
  currentUserId: string;
  readOnly: boolean;
  /** Task owners and project admins can delete anyone's file. */
  canModerate: boolean;
}

export default function TaskAttachments({
  taskId,
  initial,
  currentUserId,
  readOnly,
  canModerate,
}: TaskAttachmentsProps) {
  const picker = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState(initial);
  const [progress, setProgress] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<AttachmentDTO | null>(null);
  const [confirming, setConfirming] = useState<AttachmentDTO | null>(null);

  /**
   * XHR rather than fetch: fetch still can't report upload progress, and a
   * 100 MB video with no feedback looks like a hung page.
   */
  const upload = (file: File) =>
    new Promise<void>((resolve) => {
      const form = new FormData();
      form.append("file", file);

      const request = new XMLHttpRequest();
      request.open("POST", `/api/tasks/${taskId}/attachments`);

      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      request.addEventListener("load", () => {
        try {
          const data = JSON.parse(request.responseText || "{}");
          if (request.status >= 200 && request.status < 300) {
            setAttachments(data.attachments);
            setError(null);
          } else {
            setError(
              typeof data.error === "string" ? data.error : "Upload failed.",
            );
          }
        } catch {
          setError("Upload failed.");
        }
        resolve();
      });

      request.addEventListener("error", () => {
        setError("Network error during upload.");
        resolve();
      });

      request.send(form);
    });

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      // Same rules the server enforces, run first so an oversized file isn't
      // pushed over the wire just to be rejected.
      const check = checkFile(file.name, file.type, file.size);
      if (!check.ok) {
        setError(`${file.name}: ${check.error}`);
        continue;
      }

      setProgress(0);
      await upload(file);
      setProgress(null);
    }

    if (picker.current) picker.current.value = "";
  };

  const remove = async () => {
    if (!confirming) return;

    setBusyId(confirming.id);
    setError(null);

    const res = await fetch(`/api/attachments/${confirming.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setAttachments((current) =>
        current.filter((item) => item.id !== confirming.id),
      );
      setConfirming(null);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Could not delete that file.",
      );
    }

    setBusyId(null);
  };

  const uploading = progress !== null;

  return (
    <Card className="p-6">
      <SectionHeader
        title="Attachments"
        subtitle={`Images up to ${MAX_FILE_SIZE.image / MB} MB · videos ${MAX_FILE_SIZE.video / MB} MB · documents ${MAX_FILE_SIZE.document / MB} MB`}
        action={
          !readOnly ? (
            <button
              type="button"
              onClick={() => picker.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              {uploading ? `Uploading ${progress}%` : "Upload"}
            </button>
          ) : undefined
        }
      />

      <input
        ref={picker}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => handleFiles(event.target.files)}
        className="sr-only"
        aria-label="Choose files to upload"
      />

      {uploading && (
        <div
          role="progressbar"
          aria-valuenow={progress ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Uploading, ${progress}%`}
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {attachments.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title="No attachments yet"
          message="Upload an image, video, or document."
          action={
            !readOnly ? (
              <button
                type="button"
                onClick={() => picker.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload a file
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {attachments.map((attachment) => (
            <AttachmentCard
              key={attachment.id}
              attachment={attachment}
              busy={busyId === attachment.id}
              canDelete={
                !readOnly &&
                (canModerate || attachment.uploadedById === currentUserId)
              }
              onOpen={setPreviewing}
              onDelete={setConfirming}
            />
          ))}
        </div>
      )}

      {previewing && (
        <AttachmentPreview
          attachment={previewing}
          onClose={() => setPreviewing(null)}
        />
      )}

      {confirming && (
        <Modal
          size="sm"
          open
          onClose={() => setConfirming(null)}
          title="Delete attachment?"
          description="This file will be removed from this task."
        >
          <div className="flex flex-col gap-5">
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-slate-100">
                {confirming.fileName}
              </strong>{" "}
              will be permanently deleted from storage.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={remove}
                disabled={busyId === confirming.id}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-700 disabled:opacity-60"
              >
                {busyId === confirming.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
