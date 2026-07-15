import {
  ArrowLeft,
  CalendarDays,
  CheckSquare2,
  Clock3,
  FileText,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function CaseCommandCenterPage({
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
    .select("id, title, case_number, case_type, cnr_number, court_name, status, filing_date, notes, client_id, created_at")
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
          <Link href="/cases" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">All cases</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex min-w-0 flex-col gap-4 border-b pb-7 sm:pb-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium capitalize text-emerald-700">{caseRecord.status}</span>
            <span className="text-sm text-muted-foreground">{caseRecord.case_number}</span>
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">{caseRecord.title}</h1>
            <p className="mt-3 flex items-start gap-2 break-words text-sm text-muted-foreground sm:text-base">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {caseRecord.court_name}
            </p>
          </div>
        </div>

        <div className="mt-7 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-6">
            <Card className="gap-5 py-6 shadow-sm">
              <CardHeader className="px-5 sm:px-6">
                <h2 className="text-lg font-semibold tracking-tight">Case summary</h2>
              </CardHeader>
              <CardContent className="grid gap-5 px-5 sm:grid-cols-2 sm:px-6">
                <div>
                  <p className="text-sm text-muted-foreground">Case type</p>
                  <p className="mt-1 break-words font-medium">{caseRecord.case_type || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CNR number</p>
                  <p className="mt-1 break-words font-medium">{caseRecord.cnr_number || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Filing date</p>
                  <p className="mt-1 font-medium">{caseRecord.filing_date ? formatDate(caseRecord.filing_date) : "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Case number</p>
                  <p className="mt-1 break-words font-medium">{caseRecord.case_number}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-5 py-6 shadow-sm">
              <CardHeader className="px-5 sm:px-6">
                <h2 className="text-lg font-semibold tracking-tight">Next hearing</h2>
              </CardHeader>
              <CardContent className="px-5 sm:px-6">
                <div className="flex items-start gap-4 rounded-xl border border-dashed bg-muted/30 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-muted-foreground ring-1 ring-border">
                    <CalendarDays className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-medium">No upcoming hearing scheduled</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">Hearing scheduling will appear here in a future Lawdi update.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-5 py-6 shadow-sm">
              <CardHeader className="px-5 sm:px-6">
                <h2 className="text-lg font-semibold tracking-tight">Notes</h2>
              </CardHeader>
              <CardContent className="px-5 sm:px-6">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                  {caseRecord.notes || "No notes added to this case."}
                </p>
              </CardContent>
            </Card>

            <Card className="gap-5 py-6 shadow-sm">
              <CardHeader className="px-5 sm:px-6">
                <h2 className="text-lg font-semibold tracking-tight">Recent activity</h2>
              </CardHeader>
              <CardContent className="px-5 sm:px-6">
                <div className="flex items-start gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Clock3 className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-medium">Case created</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(caseRecord.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="min-w-0 space-y-6 lg:sticky lg:top-6">
            <Card className="gap-5 py-6 shadow-sm">
              <CardHeader className="flex-row items-center gap-3 px-5">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <UserRound className="size-5" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-semibold tracking-tight">Client</h2>
              </CardHeader>
              <CardContent className="space-y-4 px-5">
                <p className="break-words font-semibold">{client?.name || "Client unavailable"}</p>
                {client?.phone ? (
                  <p className="flex items-start gap-2 break-all text-sm text-muted-foreground"><Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{client.phone}</p>
                ) : null}
                {client?.email ? (
                  <p className="flex items-start gap-2 break-all text-sm text-muted-foreground"><Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{client.email}</p>
                ) : null}
                {!client?.phone && !client?.email ? <p className="text-sm text-muted-foreground">No contact details added.</p> : null}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="gap-3 py-5 shadow-sm">
                <CardContent className="px-4">
                  <FileText className="size-5 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-4 text-2xl font-semibold">0</p>
                  <p className="mt-1 text-sm text-muted-foreground">Documents</p>
                </CardContent>
              </Card>
              <Card className="gap-3 py-5 shadow-sm">
                <CardContent className="px-4">
                  <CheckSquare2 className="size-5 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-4 text-2xl font-semibold">0</p>
                  <p className="mt-1 text-sm text-muted-foreground">Open tasks</p>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
