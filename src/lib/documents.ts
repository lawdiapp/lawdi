export const DOCUMENT_BUCKET = "case-documents";
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_CASE_DOCUMENTS = 25;
export const MAX_PRACTICE_DOCUMENT_BYTES = 500 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

const MIME_EXTENSIONS: Record<AllowedDocumentMimeType, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
};

export type DocumentFileValidation =
  | {
      valid: false;
      error: string;
    }
  | {
      valid: true;
      fileName: string;
      mimeType: AllowedDocumentMimeType;
    };

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function documentTypeLabel(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "image/jpeg") return "JPEG";
  if (mimeType === "image/png") return "PNG";
  return "File";
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop();
  return extension && extension !== fileName ? extension.toLowerCase() : "";
}

function isAllowedMimeType(value: string): value is AllowedDocumentMimeType {
  return (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(value);
}

export function sanitizeDocumentFileName(fileName: string) {
  const basename = fileName.split(/[\\/]/).pop()?.normalize("NFKC") ?? "document";
  const sanitized = basename
    .replace(/[^\p{L}\p{N}._() -]/gu, "_")
    .replace(/\s+/g, " ")
    .replace(/_+/g, "_")
    .trim()
    .slice(0, 180);

  return sanitized && sanitized !== "." && sanitized !== ".."
    ? sanitized
    : "document";
}

export function validateDocumentSelection(file: File): DocumentFileValidation {
  if (!file.size) {
    return { valid: false, error: "Choose a non-empty PDF, JPG, JPEG, or PNG file." };
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return { valid: false, error: "The selected file is larger than the 10 MB limit." };
  }

  if (!isAllowedMimeType(file.type)) {
    return { valid: false, error: "Choose a PDF, JPG, JPEG, or PNG file." };
  }

  const extension = getFileExtension(file.name);
  if (!MIME_EXTENSIONS[file.type].includes(extension)) {
    return { valid: false, error: "The file extension does not match its file type." };
  }

  return {
    valid: true,
    fileName: sanitizeDocumentFileName(file.name),
    mimeType: file.type,
  };
}

export async function validateDocumentFile(
  file: File,
): Promise<DocumentFileValidation> {
  const basicValidation = validateDocumentSelection(file);
  if (!basicValidation.valid) return basicValidation;

  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isPdf =
    header.length >= 5 &&
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d;
  const isJpeg =
    header.length >= 3 &&
    header[0] === 0xff &&
    header[1] === 0xd8 &&
    header[2] === 0xff;
  const isPng =
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a;

  const contentMatches =
    (basicValidation.mimeType === "application/pdf" && isPdf) ||
    (basicValidation.mimeType === "image/jpeg" && isJpeg) ||
    (basicValidation.mimeType === "image/png" && isPng);

  return contentMatches
    ? basicValidation
    : {
        valid: false,
        error: "The file contents do not match the selected file type.",
      };
}
