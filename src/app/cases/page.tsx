import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/dates";
import { getLatestHearingsByCase } from "@/lib/hearings";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export default async function CasesPage() {
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

  const { data: cases, error } = await supabase
    .from("cases")
    .select("id, title, case_number, court_name, status, client_id, created_at")
    .eq("practice_id", practice.id)
    .order("created_at", { ascending: false });

  const clientIds = Array.from(
    new Set((cases ?? []).flatMap((item) => (item.client_id ? [item.client_id] : []))),
  );
  const { data: clients } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id, name")
        .eq("practice_id", practice.id)
        .in("id", clientIds)
    : { data: [] };
  const clientNames = new Map((clients ?? []).map((client) => [client.id, client.name]));
  const { data: hearingRows } = await supabase
    .from("hearings")
    .select("id, case_id, hearing_date, hearing_time, notes, next_hearing_date, next_hearing_time, created_at")
    .eq("practice_id", practice.id);
  const latestHearings = getLatestHearingsByCase(hearingRows ?? []);

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

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Practice matters</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Cases</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              A clear view of every active matter in {practice.name}.
            </p>
          </div>
          <Link href="/cases/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80">
            <Plus className="size-4" aria-hidden="true" />
            Add case
          </Link>
        </div>

        <div className="mt-8">
          {error ? (
            <Card className="py-8">
              <CardContent className="text-center text-sm text-muted-foreground">
                We could not load your cases. Please refresh and try again.
              </CardContent>
            </Card>
          ) : cases?.length ? (
            <div className="grid gap-4">
              {cases.map((item) => (
                <Link key={item.id} href={`/cases/${item.id}`} className="group block min-w-0">
                  <Card className="gap-4 py-5 shadow-sm transition-colors group-hover:ring-foreground/25">
                    <CardContent className="grid min-w-0 gap-4 px-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h2 className="min-w-0 break-words text-lg font-semibold tracking-tight">{item.title}</h2>
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">{item.status}</span>
                        </div>
                        <p className="mt-2 break-words text-sm text-muted-foreground">
                          {item.case_number} · {item.court_name}
                        </p>
                        <p className="mt-1 break-words text-sm font-medium">
                          {item.client_id ? clientNames.get(item.client_id) ?? "Client unavailable" : "No client"}
                        </p>
                        {latestHearings.get(item.id)?.next_hearing_date ? (
                          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-primary">
                            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                            <span className="font-medium">
                              Next: {formatDate(latestHearings.get(item.id)!.next_hearing_date!)}
                            </span>
                            <span className="text-muted-foreground">
                              {formatTime(latestHearings.get(item.id)!.next_hearing_time) ?? "Time not set"}
                            </span>
                          </p>
                        ) : null}
                      </div>
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground group-hover:text-foreground">
                        Open case
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="py-10 shadow-sm sm:py-14">
              <CardHeader className="items-center gap-4 px-6 text-center">
                <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <BriefcaseBusiness className="size-7" aria-hidden="true" />
                </span>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold tracking-tight">Your case list is ready</h2>
                  <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
                    Add the first matter for your practice and Lawdi will keep the case and client together.
                  </p>
                </div>
                <Link href="/cases/new" className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80">
                  <Plus className="size-4" aria-hidden="true" />
                  Add your first case
                </Link>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
