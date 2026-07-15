"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { CreateHearingActionState } from "@/app/cases/[id]/hearings/new/actions";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

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

export async function setNextHearing(
  caseId: string,
  _previousState: CreateHearingActionState,
  formData: FormData,
): Promise<CreateHearingActionState> {
  if (!isValidUuid(caseId)) {
    return { error: "This case is unavailable." };
  }

  const nextHearingDate = readTrimmed(formData, "nextHearingDate");
  const nextHearingTime = readTrimmed(formData, "nextHearingTime");
  const fieldErrors: CreateHearingActionState["fieldErrors"] = {};

  if (!nextHearingDate || !isValidDate(nextHearingDate)) {
    fieldErrors.nextHearingDate = "Enter a valid next hearing date.";
  }
  if (nextHearingTime && !isValidTime(nextHearingTime)) {
    fieldErrors.nextHearingTime = "Enter a valid next hearing time.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Review the highlighted fields before scheduling this hearing.",
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

  const { data: hearingId, error } = await supabase.rpc("set_next_hearing", {
    target_case_id: caseId,
    scheduled_date: nextHearingDate,
    scheduled_time: nextHearingTime || undefined,
  });

  if (error || !hearingId) {
    return {
      error:
        error?.code === "22023"
          ? "The hearing diary changed. Refresh the case and try again."
          : "We could not schedule the next hearing. Please try again.",
    };
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/dashboard");
  redirect(`/cases/${caseId}?hearing=scheduled`);
}
