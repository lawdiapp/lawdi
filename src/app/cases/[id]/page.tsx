import { notFound, redirect } from "next/navigation";

import {
  CaseCommandCenter,
  type CaseClient,
  type CaseRecord,
  type DocumentRow,
  type FollowUpRow,
  type HearingRow,
} from "@/components/cases/case-command-center";
import { sortHearingsNewestFirst } from "@/lib/hearings";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export default async function CaseCommandCenterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    hearing?: string;
    followUp?: string;
    document?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
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
    .select(
      "id, title, case_number, case_type, cnr_number, court_name, status, filing_date, notes, client_id, created_at",
    )
    .eq("id", id)
    .eq("practice_id", practice.id)
    .maybeSingle();

  if (error || !caseRecord) {
    notFound();
  }

  const { data: client } = caseRecord.client_id
    ? await supabase
        .from("clients")
        .select("id, name, phone, email, address")
        .eq("id", caseRecord.client_id)
        .eq("practice_id", practice.id)
        .maybeSingle()
    : { data: null };

  const { data: hearingRows, error: hearingsError } = await supabase
    .from("hearings")
    .select(
      "id, case_id, hearing_date, hearing_time, notes, next_hearing_date, next_hearing_time, created_at",
    )
    .eq("case_id", id)
    .eq("practice_id", practice.id);
  const hearings = sortHearingsNewestFirst(hearingRows ?? []) as HearingRow[];

  const [
    pendingFollowUpsResult,
    completedFollowUpsResult,
    documentsResult,
    documentUsageResult,
  ] = await Promise.all([
    supabase
      .from("follow_ups")
      .select("id, title, due_date, reminder_at, completed_at, created_at")
      .eq("case_id", id)
      .eq("practice_id", practice.id)
      .is("completed_at", null)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("follow_ups")
      .select("id, title, due_date, reminder_at, completed_at, created_at")
      .eq("case_id", id)
      .eq("practice_id", practice.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(5),
    supabase
      .from("documents")
      .select("id, file_name, mime_type, file_size, description, created_at")
      .eq("case_id", id)
      .eq("practice_id", practice.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_case_document_usage", { target_case_id: id }),
  ]);

  return (
    <CaseCommandCenter
      caseId={id}
      practiceName={practice.name}
      caseRecord={caseRecord as CaseRecord}
      client={client as CaseClient}
      hearings={hearings}
      hearingsError={Boolean(hearingsError)}
      pendingFollowUps={(pendingFollowUpsResult.data ?? []) as FollowUpRow[]}
      completedFollowUps={(completedFollowUpsResult.data ?? []) as FollowUpRow[]}
      followUpsError={Boolean(
        pendingFollowUpsResult.error || completedFollowUpsResult.error,
      )}
      documents={(documentsResult.data ?? []) as DocumentRow[]}
      documentsError={Boolean(
        documentsResult.error || documentUsageResult.error,
      )}
      documentUsage={documentUsageResult.data?.[0]}
      query={query}
    />
  );
}
