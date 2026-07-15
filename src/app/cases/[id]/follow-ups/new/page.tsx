import { notFound, redirect } from "next/navigation";

import { FollowUpForm } from "@/components/follow-ups/follow-up-form";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export default async function NewFollowUpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: caseRecord, error } = await supabase
    .from("cases")
    .select("id, title")
    .eq("id", id)
    .eq("practice_id", practice.id)
    .maybeSingle();

  if (error || !caseRecord) {
    notFound();
  }

  return <FollowUpForm caseId={id} caseTitle={caseRecord.title} />;
}
