import { notFound, redirect } from "next/navigation";

import { DOCUMENT_BUCKET } from "@/lib/documents";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await context.params;
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

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, file_name, storage_path")
    .eq("id", documentId)
    .eq("case_id", id)
    .eq("practice_id", practice.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !document) {
    notFound();
  }

  const shouldDownload = new URL(request.url).searchParams.get("download") === "1";
  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(
      document.storage_path,
      60,
      shouldDownload ? { download: document.file_name } : undefined,
    );

  if (signedUrlError || !signedUrl) {
    notFound();
  }

  redirect(signedUrl.signedUrl);
}
