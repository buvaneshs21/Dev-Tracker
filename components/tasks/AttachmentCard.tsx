"use client";

import {
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Loader2,
  Play,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatFileSize } from "@/lib/attachment-config";
import { relativeTime } from "@/lib/format";
import type { AttachmentDTO } from "@/lib/types";

const DOC_ICONS: Record<string, LucideIcon> = {
  "application/pdf": FileText,
  "text/csv": FileSpreadsheet,
  "application/vnd.ms-excel": FileSpreadsheet,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    FileSpreadsheet,
};

interface AttachmentCardProps {
  attachment: AttachmentDTO;
  canDelete: boolean;
  busy: boolean;
  onOpen: (attachment: AttachmentDTO) => void;
  onDelete: (attachment: AttachmentDTO) => void;
}

export default function AttachmentCard({
  attachment,
  canDelete,
  busy,
  onOpen,
  onDelete,
}: AttachmentCardProps) {
  const previewable =
    attachment.category === "image" ||
    attachment.category === "video" ||
    attachment.mimeType === "application/pdf";

  const Icon =
    attachment.category === "archive"
      ? FileArchive
      : (DOC_ICONS[attachment.mimeType] ?? FileText);

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <button
        type="button"
        onClick={() => previewable && onOpen(attachment)}
        disabled={!previewable}
        aria-label={previewable ? `Preview ${attachment.fileName}` : undefined}
        className="flex h-32 w-full items-center justify-center overflow-hidden bg-slate-50 disabled:cursor-default dark:bg-slate-800/60"
      >
        {attachment.category === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.url}
            alt={attachment.fileName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : attachment.category === "video" ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/80 text-white">
            <Play className="h-5 w-5 translate-x-0.5" aria-hidden="true" />
          </span>
        ) : (
          <Icon
            className="h-9 w-9 text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          />
        )}
      </button>

      <div className="p-3.5">
        <p
          className="truncate text-sm font-medium text-slate-900 dark:text-slate-100"
          title={attachment.fileName}
        >
          {attachment.fileName}
        </p>

        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {formatFileSize(attachment.fileSize)} ·{" "}
          {relativeTime(attachment.createdAt)}
        </p>
        <p className="truncate text-xs text-slate-400 dark:text-slate-500">
          {attachment.uploadedByName}
        </p>

        <div className="mt-3 flex items-center gap-1">
          <a
            href={`${attachment.url}?download=1`}
            aria-label={`Download ${attachment.fileName}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download
          </a>

          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(attachment)}
              disabled={busy}
              aria-label={`Delete ${attachment.fileName}`}
              className="ml-auto rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
