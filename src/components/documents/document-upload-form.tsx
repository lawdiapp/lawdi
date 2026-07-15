"use client";

import { FileUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";

import {
  uploadCaseDocument,
  type UploadDocumentActionState,
  type UploadDocumentField,
} from "@/app/cases/[id]/documents/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatFileSize,
  MAX_CASE_DOCUMENTS,
  MAX_PRACTICE_DOCUMENT_BYTES,
  validateDocumentSelection,
} from "@/lib/documents";

const initialState: UploadDocumentActionState = {};

function FieldError({
  field,
  state,
}: {
  field: UploadDocumentField;
  state: UploadDocumentActionState;
}) {
  const message = state.fieldErrors?.[field];

  return message ? (
    <p id={`${field}-error`} className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

export function DocumentUploadForm({
  caseId,
  caseTitle,
  activeCaseDocuments,
  activePracticeBytes,
  usageUnavailable = false,
}: {
  caseId: string;
  caseTitle: string;
  activeCaseDocuments: number;
  activePracticeBytes: number;
  usageUnavailable?: boolean;
}) {
  const action = uploadCaseDocument.bind(null, caseId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [dirty, setDirty] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientFileError, setClientFileError] = useState<string>();
  const router = useRouter();
  const caseLimitReached = activeCaseDocuments >= MAX_CASE_DOCUMENTS;
  const practiceLimitReached =
    activePracticeBytes >= MAX_PRACTICE_DOCUMENT_BYTES;

  const closeSheet = useCallback(() => {
    if (dirty && !window.confirm("Discard this document upload?")) return;

    router.replace(`/cases/${caseId}`, { scroll: false });
  }, [caseId, dirty, router]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;

      event.preventDefault();
      event.returnValue = "";
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeSheet();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSheet, dirty]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setDirty(Boolean(file));

    if (!file) {
      setClientFileError(undefined);
      return;
    }

    const validation = validateDocumentSelection(file);
    if (!validation.valid) {
      setClientFileError(validation.error);
      return;
    }

    if (activePracticeBytes + file.size > MAX_PRACTICE_DOCUMENT_BYTES) {
      setClientFileError(
        "This upload would exceed the practice’s 500 MB active document limit.",
      );
      return;
    }

    setClientFileError(undefined);
  }

  const uploadUnavailable =
    usageUnavailable || caseLimitReached || practiceLimitReached;

  return (
    <main className="fixed inset-0 z-50 flex items-stretch justify-end bg-foreground/20">
      <button
        type="button"
        aria-label="Close Upload Document"
        onClick={closeSheet}
        className="absolute inset-0 cursor-default backdrop-blur-[1px]"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-upload-title"
        className="relative z-10 flex h-svh w-full flex-col overflow-hidden bg-background shadow-2xl md:max-w-[500px] md:border-l"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={closeSheet}
          className="absolute right-2.5 top-2.5 z-20 grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <header className="border-b px-4 py-3 pr-12 sm:px-5 sm:pr-12">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {caseTitle}
          </p>
          <h1
            id="document-upload-title"
            className="mt-0.5 text-lg font-semibold tracking-tight"
          >
            Upload Document
          </h1>
        </header>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Case files</p>
                <p className="mt-0.5 font-medium">
                  {activeCaseDocuments} of {MAX_CASE_DOCUMENTS}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Practice storage</p>
                <p className="mt-0.5 font-medium">
                  {formatFileSize(activePracticeBytes)} of 500 MB
                </p>
              </div>
            </div>

            {usageUnavailable ? (
              <FormMessage>
                We could not verify document usage. Refresh the case before uploading.
              </FormMessage>
            ) : caseLimitReached ? (
              <FormMessage>
                This case has 25 active documents. Move one to Trash before uploading another.
              </FormMessage>
            ) : practiceLimitReached ? (
              <FormMessage>
                Your practice has reached its 500 MB active document limit.
              </FormMessage>
            ) : state.error ? (
              <FormMessage>{state.error}</FormMessage>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <label
                htmlFor="file"
                className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 py-4 text-center transition-colors hover:bg-muted/40"
              >
                <FileUp className="size-6 text-muted-foreground" aria-hidden="true" />
                <span className="mt-2 break-all text-sm font-medium">
                  {selectedFile?.name ?? "Choose a document"}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  PDF, JPG, JPEG, or PNG · maximum 10 MB
                </span>
              </label>
              <Input
                id="file"
                name="file"
                type="file"
                required
                disabled={uploadUnavailable || pending}
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={handleFileChange}
                aria-invalid={Boolean(clientFileError || state.fieldErrors?.file)}
                aria-describedby={
                  clientFileError || state.fieldErrors?.file
                    ? "file-error"
                    : undefined
                }
                className="sr-only"
              />
              {clientFileError ? (
                <p id="file-error" className="text-sm text-destructive">
                  {clientFileError}
                </p>
              ) : (
                <FieldError field="file" state={state} />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                maxLength={1000}
                rows={3}
                placeholder="Optional note about this document"
                disabled={uploadUnavailable || pending}
                onChange={(event) => setDirty(Boolean(event.target.value) || Boolean(selectedFile))}
                aria-invalid={Boolean(state.fieldErrors?.description)}
                aria-describedby={
                  state.fieldErrors?.description
                    ? "description-error"
                    : undefined
                }
                className="flex min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <FieldError field="description" state={state} />
            </div>
          </div>

          <footer className="sticky bottom-0 grid shrink-0 gap-2 border-t bg-background px-4 py-3 sm:flex sm:items-center sm:justify-end sm:px-5">
            <Button
              type="submit"
              disabled={
                pending || uploadUnavailable || Boolean(clientFileError)
              }
              className="h-11 sm:order-2 sm:px-6"
            >
              {pending ? "Uploading…" : "Upload Document"}
            </Button>
            <button
              type="button"
              onClick={closeSheet}
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:order-1"
            >
              Cancel
            </button>
          </footer>
        </form>
      </section>
    </main>
  );
}
