import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CaseWizard } from "@/components/cases/case-wizard";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export default async function NewCasePage() {
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

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, phone, email")
    .eq("practice_id", practice.id)
    .order("name");

  return (
    <main className="min-h-svh w-full overflow-x-hidden bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary font-semibold text-primary-foreground">L</span>
            <span className="min-w-0">
              <span className="block font-semibold tracking-tight">Lawdi</span>
              <span className="block truncate text-xs text-muted-foreground">{practice.name}</span>
            </span>
          </Link>
          <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {error ? (
          <div role="alert" className="rounded-xl border bg-background p-5 text-sm text-muted-foreground shadow-sm">
            We could not load your clients. Return to the dashboard and try again.
          </div>
        ) : (
          <CaseWizard clients={clients ?? []} />
        )}
      </div>
    </main>
  );
}
