import { notFound, redirect } from "next/navigation";

import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export default async function NewCaseDocumentPage({
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

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id, title")
    .eq("id", id)
    .eq("practice_id", practice.id)
    .maybeSingle();

  if (caseError || !caseRecord) {
    notFound();
  }

  const { data: usageRows, error: usageError } = await supabase.rpc(
    "get_case_document_usage",
    { target_case_id: id },
  );
  const usage = usageRows?.[0];

  return (
    <DocumentUploadForm
      caseId={id}
      caseTitle={caseRecord.title}
      activeCaseDocuments={usage?.active_case_documents ?? 0}
      activePracticeBytes={usage?.active_practice_bytes ?? 0}
      usageUnavailable={Boolean(usageError || !usage)}
    />
  );
}
