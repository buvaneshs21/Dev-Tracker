/**
 * Single source of truth for what may be uploaded and how large it may be.
 *
 * Every limit and every accepted type lives here — the API validates against
 * it, and the file picker's `accept` attribute is generated from it, so the two
 * can't drift. The input's `accept` is a convenience only; the server never
 * trusts it.
 */

export const ATTACHMENT_CATEGORIES = [
  "image",
  "video",
  "document",
  "archive",
] as const;

export type AttachmentCategory = (typeof ATTACHMENT_CATEGORIES)[number];

const MB = 1024 * 1024;

export const MAX_FILE_SIZE: Record<AttachmentCategory, number> = {
  image: 10 * MB,
  video: 100 * MB,
  document: 25 * MB,
  archive: 50 * MB,
};

/**
 * MIME type -> category, plus the extensions we'll accept for it.
 *
 * An allow-list, deliberately: anything not named here is rejected, so no
 * executable or script type can slip through by omission.
 */
export const ALLOWED_TYPES: Record<
  string,
  { category: AttachmentCategory; extensions: string[] }
> = {
  "image/png": { category: "image", extensions: ["png"] },
  "image/jpeg": { category: "image", extensions: ["jpg", "jpeg"] },
  "image/webp": { category: "image", extensions: ["webp"] },
  "image/gif": { category: "image", extensions: ["gif"] },

  "video/mp4": { category: "video", extensions: ["mp4"] },
  "video/webm": { category: "video", extensions: ["webm"] },
  "video/quicktime": { category: "video", extensions: ["mov"] },

  "application/pdf": { category: "document", extensions: ["pdf"] },
  "application/msword": { category: "document", extensions: ["doc"] },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    category: "document",
    extensions: ["docx"],
  },
  "application/vnd.ms-excel": { category: "document", extensions: ["xls"] },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    category: "document",
    extensions: ["xlsx"],
  },
  "text/csv": { category: "document", extensions: ["csv"] },
  "text/plain": { category: "document", extensions: ["txt"] },

  "application/zip": { category: "archive", extensions: ["zip"] },
  "application/x-zip-compressed": {
    category: "archive",
    extensions: ["zip"],
  },
};

/** Generated for the file input — kept in step with the allow-list above. */
export const ACCEPT_ATTRIBUTE = Object.entries(ALLOWED_TYPES)
  .flatMap(([mime, { extensions }]) => [
    mime,
    ...extensions.map((ext) => `.${ext}`),
  ])
  .join(",");

export const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  image: "Image",
  video: "Video",
  document: "Document",
  archive: "Archive",
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

export type FileCheck =
  | { ok: true; category: AttachmentCategory }
  | { ok: false; error: string };

/**
 * Validates a file's type and size.
 *
 * The extension must agree with the declared MIME type — a browser (or a
 * crafted request) claiming `image/png` for `payload.exe` is rejected.
 */
export function checkFile(
  fileName: string,
  mimeType: string,
  size: number,
): FileCheck {
  const allowed = ALLOWED_TYPES[mimeType];

  if (!allowed) {
    return { ok: false, error: "This file type isn't supported." };
  }

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!allowed.extensions.includes(extension)) {
    return {
      ok: false,
      error: `A ${mimeType} file should end in .${allowed.extensions.join(" or .")}.`,
    };
  }

  if (size <= 0) {
    return { ok: false, error: "That file appears to be empty." };
  }

  const limit = MAX_FILE_SIZE[allowed.category];
  if (size > limit) {
    return {
      ok: false,
      error: `File size exceeds the ${Math.round(limit / MB)} MB ${allowed.category} limit.`,
    };
  }

  return { ok: true, category: allowed.category };
}
