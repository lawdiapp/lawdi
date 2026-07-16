import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  CheckSquare2,
  ChevronRight,
  CircleCheckBig,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Scale,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { moveCaseDocumentToTrash } from "@/app/cases/[id]/documents/actions";
import { completeFollowUp } from "@/app/cases/[id]/follow-ups/actions";
import { CaseDetailSheet } from "@/components/cases/case-detail-sheet";
import { CaseOverflowMenu } from "@/components/cases/case-overflow-menu";
import { FollowUpsCard } from "@/components/cases/follow-ups-card";
import { formatDate, formatDateTimeInIndia, formatTime } from "@/lib/dates";
import {
  documentTypeLabel,
  formatFileSize,
  MAX_PRACTICE_DOCUMENT_BYTES,
} from "@/lib/documents";
import {
  accentLink,
  cardSurface,
  iconTileAccent,
  iconTileNeutral,
  pillButtonPrimary,
  statusPillSuccess,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

export type CaseRecord = {
  id: string;
  title: string;
  case_number: string;
  case_type: string | null;
  cnr_number: string | null;
  court_name: string;
  status: string;
  filing_date: string | null;
  notes: string | null;
  client_id: string | null;
  created_at: string;
};

export type CaseClient = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
} | null;

export type HearingRow = {
  id: string;
  hearing_date: string;
  hearing_time: string | null;
  notes: string | null;
  next_hearing_date: string | null;
  next_hearing_time: string | null;
  created_at: string;
};

export type FollowUpRow = {
  id: string;
  title: string;
  due_date: string | null;
  reminder_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  description: string | null;
  created_at: string;
};

type Activity = {
  id: string;
  type: "case" | "hearing" | "document" | "follow-up" | "completed";
  label: string;
  detail: string;
  at: string;
};

const card = cardSurface;
const hairline = "border-t-[0.5px] border-border";
const link = cn(accentLink, "text-[12px]");
const sheetTrigger = cn(link, "min-h-0 px-0");

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dueState(dueDate: string | null) {
  if (!dueDate) return null;
  const today = todayInIndia();
  if (dueDate < today) return { label: "Overdue", className: "text-red-600" };
  if (dueDate === today) return { label: "Due today", className: "text-amber-700" };
  return null;
}

function activityIcon(type: Activity["type"]) {
  if (type === "hearing") return <CalendarClock className="size-3.5" aria-hidden="true" />;
  if (type === "document") return <FileText className="size-3.5" aria-hidden="true" />;
  if (type === "case") return <Scale className="size-3.5" aria-hidden="true" />;
  return <CheckSquare2 className="size-3.5" aria-hidden="true" />;
}

function Header({
  caseId,
  caseRecord,
  hearingHref,
}: {
  caseId: string;
  caseRecord: CaseRecord;
  hearingHref: string;
}) {
  return (
    <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-2.5">
        <Link
          href="/cases"
          aria-label="Back to cases"
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-[18px]" aria-hidden="true" />
        </Link>
        <h2 className="min-w-0 truncate text-[22px] font-bold tracking-tight">{caseRecord.title}</h2>
        <span className="shrink-0 text-[12px] text-muted-foreground">{caseRecord.case_number}</span>
      </div>

      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        <StatusBadge status={caseRecord.status} />
        <PrimaryButton href={hearingHref} />
        <CaseOverflowMenu caseId={caseId} />
      </div>

      <div className="flex items-center gap-2 lg:hidden">
        <StatusBadge status={caseRecord.status} />
        <PrimaryButton href={hearingHref} className="flex-1" />
        <CaseOverflowMenu caseId={caseId} />
      </div>
    </header>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={cn(statusPillSuccess, "shrink-0 px-3 py-[5px] text-[12px]")}>{status}</span>;
}

function PrimaryButton({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(pillButtonPrimary, "px-3.5 py-[7px] text-[12px] whitespace-nowrap", className)}
    >
      Record hearing update
    </Link>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", accent ? iconTileAccent : iconTileNeutral)}>
        <Icon className="size-4" aria-hidden={true} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-normal text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-[13px] font-medium text-foreground" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

function NextActionStrip({ caseId, followUp }: { caseId: string; followUp: FollowUpRow | undefined }) {
  if (!followUp) {
    return (
      <div className={cn(card, "flex items-center justify-between gap-3 bg-amber-50 px-4 py-2.5")}>
        <p className="text-[13px] text-amber-800">No pending follow-ups</p>
        <Link
          href={`/cases/${caseId}/follow-ups/new`}
          scroll={false}
          className="text-[11px] font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900"
        >
          Add one
        </Link>
      </div>
    );
  }

  const state = dueState(followUp.due_date);

  return (
    <div className={cn(card, "flex items-center justify-between gap-3 bg-amber-50 px-4 py-2.5")}>
      <div className="min-w-0">
        <p className="text-[11px] font-normal text-amber-700">
          Next action
          {followUp.due_date ? ` · Due ${formatDate(followUp.due_date)}` : ""}
          {state ? <span className={cn("font-medium", state.className)}> · {state.label}</span> : null}
        </p>
        <p className="mt-1 truncate text-[13px] font-medium text-foreground">{followUp.title}</p>
      </div>
      <form action={completeFollowUp.bind(null, caseId, followUp.id)}>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border-[0.5px] border-amber-300 bg-background px-2.5 py-[5px] text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-100"
        >
          <Check className="size-3" aria-hidden="true" />
          Mark done
        </button>
      </form>
    </div>
  );
}

function HearingList({ hearings }: { hearings: HearingRow[] }) {
  return (
    <ol className="divide-y divide-border">
      {hearings.map((hearing) => {
        const nextTime = formatTime(hearing.next_hearing_time);
        return (
          <li
            key={hearing.id}
            className="grid min-h-16 grid-cols-[minmax(112px,0.8fr)_minmax(0,1.4fr)] gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(128px,0.75fr)_minmax(0,1.35fr)_minmax(112px,0.8fr)]"
          >
            <div>
              <p className="text-sm font-semibold">{formatDate(hearing.hearing_date)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatTime(hearing.hearing_time) ?? "Time not set"}
              </p>
            </div>
            <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
              {hearing.notes || "No notes recorded."}
            </p>
            <p className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
              Next{" "}
              <span className="block font-medium text-foreground">
                {hearing.next_hearing_date
                  ? `${formatDate(hearing.next_hearing_date)}${nextTime ? ` · ${nextTime}` : ""}`
                  : "Not scheduled"}
              </span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function HearingsCard({
  hearings,
  hearingsError,
  limit,
}: {
  hearings: HearingRow[];
  hearingsError: boolean;
  limit: number;
}) {
  const latestHearing = hearings[0] as HearingRow | undefined;
  const hasUpcoming = Boolean(latestHearing?.next_hearing_date);
  const pastLimit = hasUpcoming ? limit - 1 : limit;
  const pastEntries = hearings.slice(0, Math.max(pastLimit, 0));
  const totalEntries = (hasUpcoming ? 1 : 0) + pastEntries.length;

  return (
    <div className={cn(card, "p-4")}>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium">Hearings</span>
        {hearings.length ? (
          <CaseDetailSheet
            title="Full hearing history"
            description={`${hearings.length} diary ${hearings.length === 1 ? "entry" : "entries"}`}
            triggerLabel="Full timeline"
            triggerClassName={sheetTrigger}
          >
            <HearingList hearings={hearings} />
          </CaseDetailSheet>
        ) : null}
      </div>

      {hearingsError ? (
        <p className="text-[12px] text-muted-foreground">The hearing diary is unavailable.</p>
      ) : totalEntries === 0 ? (
        <p className="text-[12px] text-muted-foreground">No hearings recorded yet.</p>
      ) : (
        <>
          {hasUpcoming && latestHearing?.next_hearing_date ? (
            <div className={cn("flex gap-2.5", totalEntries > 1 ? "mb-3.5" : "")}>
              <div className="flex shrink-0 flex-col items-center">
                <span className="mt-[3px] size-2.5 shrink-0 rounded-full bg-indigo-600" />
                {totalEntries > 1 ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
              </div>
              <div className="min-w-0 pb-1">
                <p className="text-[12px] font-medium text-indigo-700">
                  {formatDate(latestHearing.next_hearing_date)}
                  {latestHearing.next_hearing_time ? `, ${formatTime(latestHearing.next_hearing_time)}` : ""}
                  {" · upcoming"}
                </p>
              </div>
            </div>
          ) : null}

          {pastEntries.map((hearing, index) => (
            <div key={hearing.id} className={cn("flex gap-2.5", index < pastEntries.length - 1 ? "mb-3.5" : "")}>
              <div className="flex shrink-0 flex-col items-center">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-muted-foreground/40" />
                {index < pastEntries.length - 1 ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
              </div>
              <div className="min-w-0 pb-1">
                <p className="text-[12px] font-medium text-foreground">
                  {formatDate(hearing.hearing_date)}
                  {hearing.hearing_time ? `, ${formatTime(hearing.hearing_time)}` : ""}
                </p>
                <p className="mt-1 text-[12px] font-normal text-muted-foreground">
                  {hearing.notes || "No notes recorded."}
                </p>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function DocumentList({ caseId, documents }: { caseId: string; documents: DocumentRow[] }) {
  return (
    <ul className="divide-y divide-border">
      {documents.map((document) => (
        <li key={document.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
              <FileText className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-medium">{document.file_name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {documentTypeLabel(document.mime_type)} · {formatFileSize(document.file_size)} ·{" "}
                {formatDateTimeInIndia(document.created_at)}
              </p>
              {document.description ? (
                <p className="mt-1.5 text-sm text-muted-foreground">{document.description}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-2 flex gap-1 pl-12">
            <Link
              href={`/cases/${caseId}/documents/${document.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold hover:bg-muted"
            >
              <ExternalLink className="size-3.5" />
              Open
            </Link>
            <Link
              href={`/cases/${caseId}/documents/${document.id}?download=1`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold hover:bg-muted"
            >
              <Download className="size-3.5" />
              Download
            </Link>
            <form action={moveCaseDocumentToTrash.bind(null, caseId, document.id)}>
              <button
                type="submit"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Trash
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DocumentsCard({
  caseId,
  documents,
  documentsError,
  documentUsage,
}: {
  caseId: string;
  documents: DocumentRow[];
  documentsError: boolean;
  documentUsage: { active_case_documents: number; active_practice_bytes: number } | undefined;
}) {
  const visible = documents.slice(0, 2);

  return (
    <div className={cn(card, "p-4")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium">
          Documents <span className="text-muted-foreground">· {documents.length}</span>
        </span>
        {documents.length ? (
          <CaseDetailSheet
            title="Case documents"
            description={`${documents.length} active files · ${documentUsage ? formatFileSize(documentUsage.active_practice_bytes) : "Usage unavailable"} of ${formatFileSize(MAX_PRACTICE_DOCUMENT_BYTES)} used`}
            triggerLabel="View all"
            triggerClassName={sheetTrigger}
          >
            <DocumentList caseId={caseId} documents={documents} />
          </CaseDetailSheet>
        ) : null}
      </div>

      {documentsError ? (
        <p className="text-[12px] text-muted-foreground">Documents are unavailable.</p>
      ) : documents.length ? (
        visible.map((document) => (
          <Link
            key={document.id}
            href={`/cases/${caseId}/documents/${document.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group -mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-[5px] transition-colors hover:bg-muted"
          >
            <span className="flex min-w-0 items-center gap-1.5 truncate text-[12px] font-medium">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{document.file_name}</span>
            </span>
            <ChevronRight
              className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ))
      ) : (
        <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted-foreground">
          <span>No documents uploaded yet.</span>
          <Link
            href={`/cases/${caseId}/documents/new`}
            scroll={false}
            className="font-medium text-indigo-700 hover:text-indigo-900"
          >
            Upload one
          </Link>
        </div>
      )}
    </div>
  );
}

function CaseDetailsCard({ caseRecord }: { caseRecord: CaseRecord }) {
  const rows: [string, string][] = [
    ["Case type", caseRecord.case_type ?? "Not provided"],
    ["CNR number", caseRecord.cnr_number ?? "Not provided"],
    ["Filing date", caseRecord.filing_date ? formatDate(caseRecord.filing_date) : "Not provided"],
  ];

  return (
    <div className={cn(card, "p-4")}>
      <div className="mb-2.5 flex items-center gap-1.5">
        <ClipboardList className="size-[15px] text-muted-foreground" aria-hidden="true" />
        <span className="text-[12px] font-medium">Case details</span>
      </div>
      {rows.map(([label, value], index) => (
        <div
          key={label}
          className={cn(
            "flex items-center justify-between gap-3 py-[5px]",
            index < rows.length - 1 ? "border-b-[0.5px] border-border" : "mb-3",
          )}
        >
          <span className="text-[11px] font-normal text-muted-foreground">{label}</span>
          <span className="text-right text-[12px] font-medium text-foreground">{value}</span>
        </div>
      ))}
      <button
        type="button"
        disabled
        className="inline-flex cursor-not-allowed items-center gap-1.5 text-[12px] font-medium text-muted-foreground opacity-60"
      >
        Edit case details
        <span className="text-[10px]">Soon</span>
      </button>
    </div>
  );
}

function NotesCard({ notes }: { notes: string | null }) {
  return (
    <div className={cn(card, "p-4")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium">Notes</span>
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center gap-1.5 text-[12px] font-medium text-muted-foreground opacity-60"
        >
          Edit
          <span className="text-[10px]">Soon</span>
        </button>
      </div>
      <p className="text-[12px] leading-5 text-muted-foreground">{notes || "No notes added yet."}</p>
    </div>
  );
}

function RecentActivityCard({ activities }: { activities: Activity[] }) {
  const visible = activities.slice(0, 6);
  if (!visible.length) return null;

  return (
    <div className={cn(card, "p-4")}>
      <span className="text-[12px] font-medium">Recent activity</span>
      <div className="mt-2.5">
        {visible.map((activity, index) => (
          <div key={activity.id} className={cn("flex items-start gap-2.5 py-2", index > 0 ? hairline : "")}>
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              {activityIcon(activity.type)}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-foreground">{activity.label}</p>
              <p className="mt-1 truncate text-[11px] font-normal text-muted-foreground">
                {activity.detail} · {formatDateTime(activity.at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CaseCommandCenter({
  caseId,
  caseRecord,
  client,
  hearings,
  hearingsError,
  pendingFollowUps,
  completedFollowUps,
  followUpsError,
  documents,
  documentsError,
  documentUsage,
  query,
}: {
  caseId: string;
  practiceName: string;
  caseRecord: CaseRecord;
  client: CaseClient;
  hearings: HearingRow[];
  hearingsError: boolean;
  pendingFollowUps: FollowUpRow[];
  completedFollowUps: FollowUpRow[];
  followUpsError: boolean;
  documents: DocumentRow[];
  documentsError: boolean;
  documentUsage: { active_case_documents: number; active_practice_bytes: number } | undefined;
  query: { hearing?: string; followUp?: string; document?: string };
}) {
  const latestHearing = hearings[0] as HearingRow | undefined;
  const hearingHref =
    latestHearing && !latestHearing.next_hearing_date
      ? `/cases/${caseId}/hearings/set-next`
      : `/cases/${caseId}/hearings/new`;
  const nextHearingDate = latestHearing?.next_hearing_date ?? null;
  const nextHearingTime = latestHearing?.next_hearing_time ?? null;
  const nextHearingLabel = nextHearingDate
    ? `${formatDate(nextHearingDate)}${nextHearingTime ? `, ${formatTime(nextHearingTime)}` : ""}`
    : hearings.length > 0
      ? "Not scheduled"
      : "No hearings yet";

  const activities: Activity[] = [
    {
      id: `case-${caseRecord.id}`,
      type: "case",
      label: "Case created",
      detail: caseRecord.case_number,
      at: caseRecord.created_at,
    } as Activity,
    ...hearings.map(
      (hearing): Activity => ({
        id: `hearing-${hearing.id}`,
        type: "hearing",
        label: "Hearing recorded",
        detail: formatDate(hearing.hearing_date),
        at: hearing.created_at,
      }),
    ),
    ...documents.map(
      (document): Activity => ({
        id: `document-${document.id}`,
        type: "document",
        label: "Document uploaded",
        detail: document.file_name,
        at: document.created_at,
      }),
    ),
    ...pendingFollowUps.map(
      (followUp): Activity => ({
        id: `follow-up-${followUp.id}`,
        type: "follow-up",
        label: "Follow-up added",
        detail: followUp.title,
        at: followUp.created_at,
      }),
    ),
    ...completedFollowUps.map(
      (followUp): Activity => ({
        id: `completed-${followUp.id}`,
        type: "completed",
        label: "Follow-up completed",
        detail: followUp.title,
        at: followUp.completed_at ?? followUp.created_at,
      }),
    ),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  const successMessage =
    query.hearing === "scheduled"
      ? "Next hearing scheduled"
      : query.hearing === "created"
        ? "Hearing update saved"
        : query.followUp === "created"
          ? "Follow-up added"
          : query.followUp === "completed"
            ? "Follow-up completed"
            : query.document === "uploaded"
              ? "Document uploaded"
              : query.document === "trashed"
                ? "Document moved to Trash"
                : null;
  const hasActionError =
    query.hearing === "load-error" ||
    query.followUp === "complete-error" ||
    query.document === "trash-error";

  return (
    <main className="min-h-svh bg-background font-sans text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3.5 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Header caseId={caseId} caseRecord={caseRecord} hearingHref={hearingHref} />

        {successMessage ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] font-medium text-emerald-800"
          >
            <CircleCheckBig className="size-4 shrink-0" aria-hidden="true" />
            {successMessage}
          </div>
        ) : null}
        {hasActionError ? (
          <div
            role="alert"
            className="rounded-[12px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700"
          >
            We could not complete that action. Refresh and try again.
          </div>
        ) : null}

        {/* Desktop info row */}
        <div className="hidden items-start gap-7 border-b-[0.5px] border-border pt-2.5 pb-3.5 lg:flex">
          <InfoItem icon={User} label="Client" value={client?.name ?? "No client linked"} accent={Boolean(client)} />
          <InfoItem icon={Building2} label="Court" value={caseRecord.court_name} />
          <InfoItem
            icon={CalendarClock}
            label="Next hearing"
            value={nextHearingLabel}
            accent={Boolean(nextHearingDate)}
          />
        </div>

        {/* Mobile-only stack */}
        <div className="flex flex-col gap-3.5 lg:hidden">
          <div
            className={cn(card, "border-l-[3px] p-4", nextHearingDate ? "border-l-indigo-600" : "border-l-border")}
          >
            <div
              className={cn(
                "flex items-center gap-1.5",
                nextHearingDate ? "text-indigo-600" : "text-muted-foreground",
              )}
            >
              <CalendarClock className="size-4" aria-hidden="true" />
              <p className="text-[11px] font-normal tracking-wide uppercase">Next hearing</p>
            </div>
            <p className="mt-1 text-[18px] font-semibold text-foreground">{nextHearingLabel}</p>
          </div>

          <NextActionStrip caseId={caseId} followUp={pendingFollowUps[0]} />

          <div className="grid grid-cols-2 gap-3">
            <div className={cn(card, "p-4")}>
              <InfoItem
                icon={User}
                label="Client"
                value={client?.name ?? "No client linked"}
                accent={Boolean(client)}
              />
            </div>
            <div className={cn(card, "p-4")}>
              <InfoItem icon={Building2} label="Court" value={caseRecord.court_name} />
            </div>
          </div>

          <HearingsCard hearings={hearings} hearingsError={hearingsError} limit={2} />
          <DocumentsCard
            caseId={caseId}
            documents={documents}
            documentsError={documentsError}
            documentUsage={documentUsage}
          />
          <FollowUpsCard
            caseId={caseId}
            pendingFollowUps={pendingFollowUps}
            completedFollowUps={completedFollowUps}
            followUpsError={followUpsError}
          />
          <CaseDetailsCard caseRecord={caseRecord} />
          <NotesCard notes={caseRecord.notes} />
          <RecentActivityCard activities={activities} />
        </div>

        {/* Desktop grid: left 1fr / middle 1.25fr / right 1fr */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start lg:gap-3">
          <CaseDetailsCard caseRecord={caseRecord} />

          <div className="flex min-w-0 flex-col gap-3">
            <NextActionStrip caseId={caseId} followUp={pendingFollowUps[0]} />
            <HearingsCard hearings={hearings} hearingsError={hearingsError} limit={3} />
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <DocumentsCard
              caseId={caseId}
              documents={documents}
              documentsError={documentsError}
              documentUsage={documentUsage}
            />
            <FollowUpsCard
              caseId={caseId}
              pendingFollowUps={pendingFollowUps}
              completedFollowUps={completedFollowUps}
              followUpsError={followUpsError}
            />
            <NotesCard notes={caseRecord.notes} />
          </div>
        </div>
      </div>
    </main>
  );
}
