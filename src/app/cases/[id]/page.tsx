import {
  ArrowLeft,
  CalendarDays,
  CheckSquare2,
  CircleCheckBig,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  History,
  Mail,
  MapPin,
  Plus,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { moveCaseDocumentToTrash } from "@/app/cases/[id]/documents/actions";
import { completeFollowUp } from "@/app/cases/[id]/follow-ups/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDate, formatDateTimeInIndia, formatTime } from "@/lib/dates";
import {
  documentTypeLabel,
  formatFileSize,
  MAX_CASE_DOCUMENTS,
  MAX_PRACTICE_DOCUMENT_BYTES,
} from "@/lib/documents";
import { sortHearingsNewestFirst } from "@/lib/hearings";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

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

  const { data: hearingRows, error: hearingsError } = await supabase
    .from("hearings")
    .select("id, case_id, hearing_date, hearing_time, notes, next_hearing_date, next_hearing_time, created_at")
    .eq("case_id", id)
    .eq("practice_id", practice.id);
  const hearings = sortHearingsNewestFirst(hearingRows ?? []);
  const latestHearing = hearings[0];
  const hasNextHearing = Boolean(latestHearing?.next_hearing_date);
  const [pendingFollowUpsResult, completedFollowUpsResult] = await Promise.all([
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
  ]);
  const pendingFollowUps = pendingFollowUpsResult.data ?? [];
  const completedFollowUps = completedFollowUpsResult.data ?? [];
  const followUpsError =
    pendingFollowUpsResult.error || completedFollowUpsResult.error;
  const [documentsResult, documentUsageResult] = await Promise.all([
    supabase
      .from("documents")
      .select("id, file_name, mime_type, file_size, description, created_at")
      .eq("case_id", id)
      .eq("practice_id", practice.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_case_document_usage", { target_case_id: id }),
  ]);
  const documents = documentsResult.data ?? [];
  const documentUsage = documentUsageResult.data?.[0];
  const documentsError = documentsResult.error || documentUsageResult.error;

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

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {query.hearing === "created" || query.hearing === "scheduled" ? (
          <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
            <CircleCheckBig className="size-4 shrink-0" aria-hidden="true" />
            <p className="font-medium">
              {query.hearing === "scheduled"
                ? "Next hearing scheduled"
                : "Hearing update saved"}
            </p>
          </div>
        ) : null}
        {query.hearing === "load-error" ? (
          <div role="alert" className="mb-6 rounded-xl border bg-background p-4 text-sm text-destructive">
            We could not load the hearing diary. Please refresh and try again.
          </div>
        ) : null}
        {query.followUp === "created" || query.followUp === "completed" ? (
          <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
            <CircleCheckBig className="size-4 shrink-0" aria-hidden="true" />
            <p className="font-medium">
              {query.followUp === "created"
                ? "Follow-up added"
                : "Follow-up completed"}
            </p>
          </div>
        ) : null}
        {query.followUp === "complete-error" ? (
          <div role="alert" className="mb-4 rounded-lg border bg-background px-3 py-2.5 text-sm text-destructive">
            We could not complete that follow-up. Refresh and try again.
          </div>
        ) : null}
        {query.document === "uploaded" || query.document === "trashed" ? (
          <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
            <CircleCheckBig className="size-4 shrink-0" aria-hidden="true" />
            <p className="font-medium">
              {query.document === "uploaded"
                ? "Document uploaded"
                : "Document moved to Trash"}
            </p>
          </div>
        ) : null}
        {query.document === "trash-error" ? (
          <div role="alert" className="mb-4 rounded-lg border bg-background px-3 py-2.5 text-sm text-destructive">
            We could not move that document to Trash. Refresh and try again.
          </div>
        ) : null}
        <div className="flex min-w-0 flex-col gap-3 border-b pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium capitalize text-emerald-700">{caseRecord.status}</span>
            <span className="text-sm text-muted-foreground">{caseRecord.case_number}</span>
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{caseRecord.title}</h1>
            <p className="mt-2 flex items-start gap-2 break-words text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {caseRecord.court_name}
            </p>
          </div>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-5">
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

            <Card className="gap-0 py-0 shadow-sm">
              <CardContent className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {latestHearing ? "Next hearing" : "Hearing diary"}
                    </p>
                    {hasNextHearing && latestHearing?.next_hearing_date ? (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                        <span>{formatDate(latestHearing.next_hearing_date)}</span>
                        <span className="inline-flex items-center gap-1 text-sm font-normal text-muted-foreground">
                          <Clock3 className="size-3.5" aria-hidden="true" />
                          {formatTime(latestHearing.next_hearing_time) ?? "Time not set"}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-0.5 font-semibold">
                        {latestHearing
                          ? "Next date not available"
                          : "No hearings recorded"}
                      </p>
                    )}
                  </div>
                </div>
                {!hearingsError ? (
                  <Link
                    href={
                      latestHearing && !hasNextHearing
                        ? `/cases/${id}/hearings/set-next`
                        : `/cases/${id}/hearings/new`
                    }
                    scroll={false}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                  >
                    {!latestHearing ? <Plus className="size-4" aria-hidden="true" /> : null}
                    {!latestHearing
                      ? "Add First Hearing"
                      : hasNextHearing
                        ? "Record Hearing Update"
                        : "Set Next Hearing"}
                  </Link>
                ) : null}
              </CardContent>
            </Card>

            <section className="overflow-hidden rounded-xl border bg-background shadow-sm" aria-labelledby="hearing-history-heading">
              <div className="flex items-center gap-2 border-b px-4 py-3 sm:px-5">
                <History className="size-4 text-muted-foreground" aria-hidden="true" />
                <h2 id="hearing-history-heading" className="font-semibold tracking-tight">Hearing history</h2>
                {hearings.length ? (
                  <span className="ml-auto text-xs text-muted-foreground">{hearings.length} {hearings.length === 1 ? "entry" : "entries"}</span>
                ) : null}
              </div>
              {hearingsError ? (
                <p role="alert" className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
                  We could not load this case’s hearing history.
                </p>
              ) : hearings.length ? (
                <ol className="relative px-4 before:absolute before:bottom-5 before:left-[23px] before:top-5 before:w-px before:bg-border sm:px-5 sm:before:left-[27px]">
                  {hearings.map((hearing) => {
                    const nextTime = formatTime(hearing.next_hearing_time);

                    return (
                      <li key={hearing.id} className="relative grid grid-cols-[14px_minmax(0,1fr)] gap-3 border-b py-3 last:border-b-0">
                        <span className="mt-1.5 size-3.5 rounded-full border-[3px] border-background bg-primary ring-1 ring-primary" aria-hidden="true" />
                        <article className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <h3 className="text-sm font-semibold">{formatDate(hearing.hearing_date)}</h3>
                            <span className="text-xs text-muted-foreground">{formatTime(hearing.hearing_time) ?? "Time not set"}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-muted-foreground">
                            {hearing.notes || "No notes recorded."}
                          </p>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            Next: <span className="font-medium text-foreground">{hearing.next_hearing_date ? `${formatDate(hearing.next_hearing_date)}${nextTime ? ` · ${nextTime}` : ""}` : "Not scheduled"}</span>
                          </p>
                        </article>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="px-4 py-5 text-sm text-muted-foreground sm:px-5">No hearing history yet.</p>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border bg-background shadow-sm" aria-labelledby="follow-ups-heading">
              <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-5">
                <CheckSquare2 className="size-4 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <h2 id="follow-ups-heading" className="font-semibold tracking-tight">Follow-ups</h2>
                  <p className="text-xs text-muted-foreground">
                    {pendingFollowUps.length} pending
                  </p>
                </div>
                <Link
                  href={`/cases/${id}/follow-ups/new`}
                  scroll={false}
                  className="ml-auto inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add Follow-up
                </Link>
              </div>

              {followUpsError ? (
                <p role="alert" className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
                  We could not load this case’s follow-ups.
                </p>
              ) : pendingFollowUps.length ? (
                <ul className="divide-y">
                  {pendingFollowUps.map((followUp) => (
                    <li key={followUp.id} className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium">{followUp.title}</p>
                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {followUp.due_date ? (
                            <span>Due {formatDate(followUp.due_date)}</span>
                          ) : null}
                          {followUp.reminder_at ? (
                            <span>Reminder {formatDateTimeInIndia(followUp.reminder_at)}</span>
                          ) : null}
                          {!followUp.due_date && !followUp.reminder_at ? (
                            <span>No date set</span>
                          ) : null}
                        </p>
                      </div>
                      <form action={completeFollowUp.bind(null, id, followUp.id)}>
                        <button
                          type="submit"
                          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted sm:w-auto"
                        >
                          <CircleCheckBig className="size-4" aria-hidden="true" />
                          Complete
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
                  No pending follow-ups.
                </p>
              )}

              {!followUpsError && completedFollowUps.length ? (
                <div className="border-t bg-muted/20 px-4 py-3 sm:px-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Completed</p>
                  <ul className="mt-2 divide-y">
                    {completedFollowUps.map((followUp) => (
                      <li key={followUp.id} className="flex items-start gap-2 py-2 text-sm first:pt-0 last:pb-0">
                        <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span className="min-w-0 break-words text-muted-foreground line-through">{followUp.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            <section className="overflow-hidden rounded-xl border bg-background shadow-sm" aria-labelledby="documents-heading">
              <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-5">
                <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <h2 id="documents-heading" className="font-semibold tracking-tight">Documents</h2>
                  <p className="text-xs text-muted-foreground">
                    {documents.length} of {MAX_CASE_DOCUMENTS} files
                  </p>
                </div>
                <Link
                  href={`/cases/${id}/documents/new`}
                  scroll={false}
                  className="ml-auto inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Upload Document
                </Link>
              </div>

              <div className="grid gap-2 border-b bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:grid-cols-2 sm:px-5">
                <p>
                  Case: <span className="font-medium text-foreground">{documentUsage?.active_case_documents ?? documents.length} of {MAX_CASE_DOCUMENTS} files</span>
                </p>
                <p>
                  Practice: <span className="font-medium text-foreground">{documentUsage ? formatFileSize(documentUsage.active_practice_bytes) : "Unavailable"} of {formatFileSize(MAX_PRACTICE_DOCUMENT_BYTES)}</span>
                </p>
              </div>

              {documentsError ? (
                <p role="alert" className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
                  We could not load this case’s documents.
                </p>
              ) : documents.length ? (
                <ul className="divide-y">
                  {documents.map((document) => (
                    <li key={document.id} className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:px-5">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-all text-sm font-medium">{document.file_name}</p>
                          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>{documentTypeLabel(document.mime_type)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatFileSize(document.file_size)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatDateTimeInIndia(document.created_at)}</span>
                          </p>
                          {document.description ? (
                            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-5 text-muted-foreground">
                              {document.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pl-12">
                        <Link
                          href={`/cases/${id}/documents/${document.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                          Open
                        </Link>
                        <Link
                          href={`/cases/${id}/documents/${document.id}?download=1`}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          <Download className="size-3.5" aria-hidden="true" />
                          Download
                        </Link>
                        <form action={moveCaseDocumentToTrash.bind(null, id, document.id)}>
                          <button
                            type="submit"
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                            Move to Trash
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-5 text-sm text-muted-foreground sm:px-5">
                  <p>No documents uploaded yet.</p>
                  <p className="mt-1 text-xs">Add a PDF or case image when it is ready.</p>
                </div>
              )}
            </section>

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
                  <p className="mt-4 text-2xl font-semibold">{documents.length}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Documents</p>
                </CardContent>
              </Card>
              <Card className="gap-3 py-5 shadow-sm">
                <CardContent className="px-4">
                  <CheckSquare2 className="size-5 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-4 text-2xl font-semibold">{pendingFollowUps.length}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Pending follow-ups</p>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
