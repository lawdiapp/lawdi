"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export type CreateHearingField =
  | "hearingDate"
  | "hearingTime"
  | "notes"
  | "nextHearingDate"
  | "nextHearingTime";

export type CreateHearingActionState = {
  error?: string;
  fieldErrors?: Partial<Record<CreateHearingField, string>>;
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
  return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/.test(
    value,
  );
}

export async function createHearing(
  caseId: string,
  _previousState: CreateHearingActionState,
  formData: FormData,
): Promise<CreateHearingActionState> {
  if (!isValidUuid(caseId)) {
    return { error: "This case is unavailable." };
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

  const { data: latestHearing, error: latestError } = await supabase
    .from("hearings")
    .select("id, hearing_date, hearing_time, next_hearing_date, next_hearing_time")
    .eq("case_id", caseId)
    .eq("practice_id", practice.id)
    .order("hearing_date", { ascending: false })
    .order("hearing_time", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    return { error: "We could not load the hearing diary. Please try again." };
  }

  const hearingDate = latestHearing?.next_hearing_date
    ? latestHearing.next_hearing_date
    : readTrimmed(formData, "hearingDate");
  const hearingTime = latestHearing
    ? latestHearing.next_hearing_time ?? ""
    : readTrimmed(formData, "hearingTime");
  const notes = readTrimmed(formData, "notes");
  const nextHearingDate = readTrimmed(formData, "nextHearingDate");
  const nextHearingTime = readTrimmed(formData, "nextHearingTime");
  const fieldErrors: CreateHearingActionState["fieldErrors"] = {};

  if (latestHearing && !latestHearing.next_hearing_date) {
    return {
      error:
        "No next hearing is scheduled from the latest diary entry. A new entry cannot be added.",
    };
  }

  if (!hearingDate || !isValidDate(hearingDate)) {
    fieldErrors.hearingDate = "Enter a valid hearing date.";
  }
  if (hearingTime && !isValidTime(hearingTime)) {
    fieldErrors.hearingTime = "Enter a valid hearing time.";
  }
  if (notes.length > 5000) {
    fieldErrors.notes = "Notes must be 5,000 characters or fewer.";
  }
  if (nextHearingDate && !isValidDate(nextHearingDate)) {
    fieldErrors.nextHearingDate = "Enter a valid next hearing date.";
  }
  if (nextHearingTime && !isValidTime(nextHearingTime)) {
    fieldErrors.nextHearingTime = "Enter a valid next hearing time.";
  }
  if (nextHearingTime && !nextHearingDate) {
    fieldErrors.nextHearingDate = "Choose a next hearing date before adding a time.";
  }
  if (
    hearingDate &&
    isValidDate(hearingDate) &&
    nextHearingDate &&
    isValidDate(nextHearingDate) &&
    nextHearingDate < hearingDate
  ) {
    fieldErrors.nextHearingDate =
      "Next hearing date cannot be earlier than the current hearing date.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Review the highlighted fields before saving this hearing.",
      fieldErrors,
    };
  }

  const { error } = await supabase.from("hearings").insert({
    practice_id: practice.id,
    case_id: caseId,
    hearing_date: hearingDate,
    hearing_time: hearingTime || null,
    notes: notes || null,
    next_hearing_date: nextHearingDate || null,
    next_hearing_time: nextHearingTime || null,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "This hearing is already in the diary."
          : "We could not add this hearing. Please try again.",
    };
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/dashboard");
  redirect(`/cases/${caseId}?hearing=created`);
}
