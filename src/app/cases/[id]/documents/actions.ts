"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  DOCUMENT_BUCKET,
  validateDocumentFile,
} from "@/lib/documents";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export type UploadDocumentField = "file" | "description";

export type UploadDocumentActionState = {
  error?: string;
  fieldErrors?: Partial<Record<UploadDocumentField, string>>;
};

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function quotaError(message: string) {
  if (message.includes("case_document_limit_reached")) {
    return "This case already has 25 active documents. Move one to Trash before uploading another.";
  }

  if (message.includes("practice_document_storage_limit_reached")) {
    return "Your practice has reached its 500 MB active document limit.";
  }

  return null;
}

export async function uploadCaseDocument(
  caseId: string,
  _previousState: UploadDocumentActionState,
  formData: FormData,
): Promise<UploadDocumentActionState> {
  if (!isValidUuid(caseId)) {
    return { error: "This case is unavailable." };
  }

  const fileValue = formData.get("file");
  const description = String(formData.get("description") ?? "").trim();
  const fieldErrors: UploadDocumentActionState["fieldErrors"] = {};

  if (!(fileValue instanceof File)) {
    fieldErrors.file = "Choose a PDF, JPG, JPEG, or PNG file.";
  }

  if (description.length > 1000) {
    fieldErrors.description = "Description must be 1,000 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0 || !(fileValue instanceof File)) {
    return {
      error: "Review the highlighted fields before uploading this document.",
      fieldErrors,
    };
  }

  const fileValidation = await validateDocumentFile(fileValue);
  if (!fileValidation.valid) {
    return {
      error: "Review the highlighted fields before uploading this document.",
      fieldErrors: { file: fileValidation.error },
    };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const practice = await getCurrentPractice(supabase, claimsData.claims.sub);

  if (!practice) {
    redirect("/onboarding");
  }

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("practice_id", practice.id)
    .maybeSingle();

  if (caseError || !caseRecord) {
    return { error: "This case is unavailable." };
  }

  const { error: preflightError } = await supabase.rpc(
    "check_case_document_upload",
    {
      target_case_id: caseId,
      incoming_file_size: fileValue.size,
    },
  );

  if (preflightError) {
    return {
      error:
        quotaError(preflightError.message) ??
        "We could not verify document storage availability. Please try again.",
    };
  }

  const documentId = crypto.randomUUID();
  const storagePath = `${practice.id}/${caseId}/${documentId}/${fileValidation.fileName}`;
  const fileBody = await fileValue.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, fileBody, {
      contentType: fileValidation.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return {
      error: "We could not upload this document. Please try again.",
    };
  }

  const { error: documentError } = await supabase.rpc("create_case_document", {
    document_id: documentId,
    target_case_id: caseId,
    uploaded_file_name: fileValidation.fileName,
    object_path: storagePath,
    uploaded_mime_type: fileValidation.mimeType,
    uploaded_file_size: fileValue.size,
    document_description: description || undefined,
  });

  if (documentError) {
    const { error: cleanupError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove([storagePath]);

    if (cleanupError) {
      console.error("[documents] Failed to clean up an unregistered upload.", {
        statusCode: cleanupError.statusCode,
      });
    }

    return {
      error:
        quotaError(documentError.message) ??
        "We could not finish saving this document. Please try again.",
    };
  }

  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}?document=uploaded`);
}

export async function moveCaseDocumentToTrash(
  caseId: string,
  documentId: string,
) {
  if (!isValidUuid(caseId) || !isValidUuid(documentId)) {
    redirect("/cases");
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const practice = await getCurrentPractice(supabase, claimsData.claims.sub);

  if (!practice) {
    redirect("/onboarding");
  }

  const { data: document, error: documentLookupError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("case_id", caseId)
    .eq("practice_id", practice.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (documentLookupError || !document) {
    redirect(`/cases/${caseId}?document=trash-error`);
  }

  const { error } = await supabase.rpc("trash_case_document", {
    target_case_id: caseId,
    target_document_id: documentId,
  });

  if (error) {
    redirect(`/cases/${caseId}?document=trash-error`);
  }

  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}?document=trashed`);
}
