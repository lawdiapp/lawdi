import { notFound, redirect } from "next/navigation";

import { HearingDiaryForm } from "@/components/hearings/hearing-diary-form";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export default async function NewHearingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const practice = await getCurrentPractice(supabase, claimsData.claims.sub);

  if (!practice) {
    redirect("/onboarding");
  }

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id, title")
    .eq("id", id)
    .eq("practice_id", practice.id)
    .maybeSingle();

  if (caseError || !caseRecord) {
    notFound();
  }

  const { data: latestHearing, error: hearingError } = await supabase
    .from("hearings")
    .select("hearing_date, hearing_time, next_hearing_date, next_hearing_time")
    .eq("case_id", id)
    .eq("practice_id", practice.id)
    .order("hearing_date", { ascending: false })
    .order("hearing_time", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (hearingError) {
    redirect(`/cases/${id}?hearing=load-error`);
  }

  if (latestHearing && !latestHearing.next_hearing_date) {
    redirect(`/cases/${id}`);
  }

  return (
    <HearingDiaryForm
      caseId={id}
      caseTitle={caseRecord.title}
      mode={latestHearing ? "subsequent" : "first"}
      currentDate={latestHearing?.next_hearing_date ?? undefined}
      currentTime={latestHearing?.next_hearing_time}
    />
  );
}
