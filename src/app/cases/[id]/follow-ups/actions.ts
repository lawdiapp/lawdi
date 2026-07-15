"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function completeFollowUp(caseId: string, followUpId: string) {
  if (!isValidUuid(caseId) || !isValidUuid(followUpId)) {
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

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("practice_id", practice.id)
    .maybeSingle();

  if (caseError || !caseRecord) {
    redirect("/cases");
  }

  const { data: completedFollowUp, error } = await supabase
    .from("follow_ups")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", followUpId)
    .eq("case_id", caseId)
    .eq("practice_id", practice.id)
    .is("completed_at", null)
    .select("id")
    .maybeSingle();

  if (error || !completedFollowUp) {
    redirect(`/cases/${caseId}?followUp=complete-error`);
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
  redirect(`/cases/${caseId}?followUp=completed`);
}
