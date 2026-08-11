"use client";

import { Download, FileText } from "lucide-react";

import Modal from "@/components/ui/Modal";
import { formatFileSize } from "@/lib/attachment-config";
import type { AttachmentDTO } from "@/lib/types";

/**
 * Full-size viewer for the types a browser can render safely.
 *
 * Everything is served from the authenticated raw route, so the preview obeys
 * the same permissions as the task itself.
 */
export default function AttachmentPreview({
  attachment,
  onClose,
}: {
  attachment: AttachmentDTO;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={attachment.fileName}
      description={`${formatFileSize(attachment.fileSize)} · uploaded by ${attachment.uploadedByName}`}
    >
      <div className="flex flex-col gap-4">
        {attachment.category === "image" && (
          // Plain <img>: next/image optimises by URL, and these are private,
          // per-request routes rather than static assets.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.url}
            alt={attachment.fileName}
            className="max-h-[60vh] w-full rounded-xl object-contain"
          />
        )}

        {attachment.category === "video" && (
          <video
            controls
            preload="metadata"
            className="max-h-[60vh] w-full rounded-xl bg-black"
          >
            <source src={attachment.url} type={attachment.mimeType} />
            Your browser can&apos;t play this video.
          </video>
        )}

        {attachment.mimeType === "application/pdf" && (
          <iframe
            src={attachment.url}
            title={attachment.fileName}
            className="h-[60vh] w-full rounded-xl border border-slate-200 dark:border-slate-800"
          />
        )}

        {attachment.category === "document" &&
          attachment.mimeType !== "application/pdf" && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 py-10 dark:border-slate-800">
              <FileText
                className="h-10 w-10 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This file type can&apos;t be previewed in the browser.
              </p>
            </div>
          )}

        <a
          href={`${attachment.url}?download=1`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download
        </a>
      </div>
    </Modal>
  );
}
