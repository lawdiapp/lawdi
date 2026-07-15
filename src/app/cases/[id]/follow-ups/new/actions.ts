"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export type CreateFollowUpField =
  | "title"
  | "dueDate"
  | "reminderDate"
  | "reminderTime";

export type CreateFollowUpActionState = {
  error?: string;
  fieldErrors?: Partial<Record<CreateFollowUpField, string>>;
};

function readTrimmed(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function createFollowUp(
  caseId: string,
  _previousState: CreateFollowUpActionState,
  formData: FormData,
): Promise<CreateFollowUpActionState> {
  if (!isValidUuid(caseId)) {
    return { error: "This case is unavailable." };
  }

  const title = readTrimmed(formData, "title");
  const dueDate = readTrimmed(formData, "dueDate");
  const reminderDate = readTrimmed(formData, "reminderDate");
  const reminderTime = readTrimmed(formData, "reminderTime");
  const fieldErrors: CreateFollowUpActionState["fieldErrors"] = {};

  if (!title) {
    fieldErrors.title = "Enter the follow-up or next action.";
  } else if (title.length > 300) {
    fieldErrors.title = "Follow-up must be 300 characters or fewer.";
  }

  if (dueDate && !isValidDate(dueDate)) {
    fieldErrors.dueDate = "Enter a valid due date.";
  }

  if (reminderDate && !isValidDate(reminderDate)) {
    fieldErrors.reminderDate = "Enter a valid reminder date.";
  }
  if (reminderTime && !isValidTime(reminderTime)) {
    fieldErrors.reminderTime = "Enter a valid reminder time.";
  }
  if (reminderDate && !reminderTime) {
    fieldErrors.reminderTime = "Choose a reminder time.";
  }
  if (reminderTime && !reminderDate) {
    fieldErrors.reminderDate = "Choose a reminder date.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Review the highlighted fields before adding this follow-up.",
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

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("practice_id", practice.id)
    .maybeSingle();

  if (caseError || !caseRecord) {
    return { error: "This case is unavailable." };
  }

  const reminderAt =
    reminderDate && reminderTime
      ? new Date(`${reminderDate}T${reminderTime}:00+05:30`).toISOString()
      : null;

  const { data: followUp, error } = await supabase
    .from("follow_ups")
    .insert({
      practice_id: practice.id,
      case_id: caseId,
      title,
      due_date: dueDate || null,
      reminder_at: reminderAt,
      created_by: claimsData.claims.sub,
    })
    .select("id")
    .single();

  if (error || !followUp) {
    return { error: "We could not add this follow-up. Please try again." };
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
  redirect(`/cases/${caseId}?followUp=created`);
}
