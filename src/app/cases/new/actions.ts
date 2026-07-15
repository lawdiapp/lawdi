"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export type CreateCaseField =
  | "caseTitle"
  | "caseNumber"
  | "courtName"
  | "caseType"
  | "cnrNumber"
  | "filingDate"
  | "notes"
  | "existingClientId"
  | "newClientName"
  | "newClientPhone"
  | "newClientEmail";

export type CreateCaseActionState = {
  error?: string;
  fieldErrors?: Partial<Record<CreateCaseField, string>>;
  success?: boolean;
  caseId?: string;
};

function readTrimmed(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function safeDatabaseError(code?: string) {
  if (code === "42501") {
    return "The selected client is unavailable. Choose a client from your practice and try again.";
  }

  if (code === "22023") {
    return "Some case details could not be accepted. Review the form and try again.";
  }

  return "We could not create this case. Please try again.";
}

export async function createCase(
  _previousState: CreateCaseActionState,
  formData: FormData,
): Promise<CreateCaseActionState> {
  const caseTitle = readTrimmed(formData, "caseTitle");
  const caseNumber = readTrimmed(formData, "caseNumber");
  const courtName = readTrimmed(formData, "courtName");
  const caseType = readTrimmed(formData, "caseType");
  const cnrNumber = readTrimmed(formData, "cnrNumber");
  const filingDate = readTrimmed(formData, "filingDate");
  const notes = readTrimmed(formData, "notes");
  const clientMode = readTrimmed(formData, "clientMode");
  const existingClientId = readTrimmed(formData, "existingClientId");
  const newClientName = readTrimmed(formData, "newClientName");
  const newClientPhone = readTrimmed(formData, "newClientPhone");
  const newClientEmail = readTrimmed(formData, "newClientEmail").toLowerCase();
  const fieldErrors: CreateCaseActionState["fieldErrors"] = {};

  if (!caseTitle) fieldErrors.caseTitle = "Enter a case title.";
  if (caseTitle.length > 200) {
    fieldErrors.caseTitle = "Case title must be 200 characters or fewer.";
  }

  if (!caseNumber) fieldErrors.caseNumber = "Enter the case number.";
  if (caseNumber.length > 120) {
    fieldErrors.caseNumber = "Case number must be 120 characters or fewer.";
  }

  if (!courtName) fieldErrors.courtName = "Enter the court name.";
  if (courtName.length > 200) {
    fieldErrors.courtName = "Court name must be 200 characters or fewer.";
  }

  if (caseType.length > 120) {
    fieldErrors.caseType = "Case type must be 120 characters or fewer.";
  }

  if (cnrNumber.length > 80) {
    fieldErrors.cnrNumber = "CNR number must be 80 characters or fewer.";
  }

  if (filingDate && !isValidDate(filingDate)) {
    fieldErrors.filingDate = "Enter a valid filing date.";
  }

  if (notes.length > 5000) {
    fieldErrors.notes = "Notes must be 5,000 characters or fewer.";
  }

  if (clientMode === "existing") {
    if (!existingClientId || !isValidUuid(existingClientId)) {
      fieldErrors.existingClientId = "Choose a client from your practice.";
    }
  } else if (clientMode === "new") {
    if (!newClientName) {
      fieldErrors.newClientName = "Enter the new client’s name.";
    }
    if (newClientName.length > 200) {
      fieldErrors.newClientName = "Client name must be 200 characters or fewer.";
    }
    if (newClientPhone.length > 40) {
      fieldErrors.newClientPhone = "Phone number must be 40 characters or fewer.";
    }
    if (newClientEmail && !isValidEmail(newClientEmail)) {
      fieldErrors.newClientEmail = "Enter a valid email address.";
    }
    if (newClientEmail.length > 320) {
      fieldErrors.newClientEmail = "Email address must be 320 characters or fewer.";
    }
  } else {
    fieldErrors.existingClientId = "Choose an existing client or create a new one.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Review the highlighted fields before saving this case.",
      fieldErrors,
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

  const { data: caseId, error } = await supabase.rpc(
    "create_case_with_client",
    {
      case_title: caseTitle,
      case_number: caseNumber,
      court_name: courtName,
      case_type: caseType || undefined,
      cnr_number: cnrNumber || undefined,
      filing_date: filingDate || undefined,
      notes: notes || undefined,
      existing_client_id:
        clientMode === "existing" ? existingClientId : undefined,
      new_client_name: clientMode === "new" ? newClientName : undefined,
      new_client_phone:
        clientMode === "new" && newClientPhone ? newClientPhone : undefined,
      new_client_email:
        clientMode === "new" && newClientEmail ? newClientEmail : undefined,
    },
  );

  if (error || !caseId) {
    return { error: safeDatabaseError(error?.code) };
  }

  revalidatePath("/cases");
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");

  return { success: true, caseId };
}
