"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  CheckSquare2,
  ChevronRight,
  ClipboardList,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";

import { formatDate, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Static, hardcoded-data preview of the redesigned Case Command Center.
 * No Supabase calls — this exists purely for design review before wiring
 * to the real cases/hearings/documents/follow_ups tables.
 */

const card =
  "rounded-[12px] border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_1px_3px_rgba(0,0,0,0.4)]";
const hairline = "border-t-[0.5px] border-border";
const link = "text-[12px] font-medium text-indigo-700 hover:text-indigo-900";

const mockCase = {
  title: "Sharma vs. State Bank of India",
  case_number: "CS-2024-0341",
  case_type: "Civil recovery",
  cnr_number: "DLHC010012342024",
  court_name: "Delhi High Court",
  status: "active",
  filing_date: "2024-02-12",
  notes: "Client confirmed no prior settlement offer accepted.",
};

const mockClient = { name: "Rohit Sharma" };

type MockHearing = {
  id: string;
  date: string;
  time: string | null;
  purpose: string | null;
  notes: string | null;
  upcoming: boolean;
};

const mockHearings: MockHearing[] = [
  {
    id: "h1",
    date: "2026-07-22",
    time: "11:00:00",
    purpose: "Final arguments · Court no. 3",
    notes: null,
    upcoming: true,
  },
  {
    id: "h2",
    date: "2026-07-08",
    time: null,
    purpose: null,
    notes: "Arguments part-heard, adjourned for rejoinder.",
    upcoming: false,
  },
  {
    id: "h3",
    date: "2026-06-15",
    time: null,
    purpose: null,
    notes: "First hearing, notice issued to defendant.",
    upcoming: false,
  },
];

const mockDocuments = [
  { id: "d1", name: "Plaint.pdf" },
  { id: "d2", name: "Reply.pdf" },
];
const documentCount = 12;

const mockFollowUps = [
  { id: "f1", title: "Collect medical bills" },
  { id: "f2", title: "Draft rejoinder" },
];
const followUpCount = 3;

const pendingAction = { title: "File rejoinder by 20 Jul" };

export function CaseCommandCenterPreview() {
  const [menuOpen, setMenuOpen] = useState(false);
  const nextHearing = mockHearings[0];
  const nextHearingLabel = `${formatDate(nextHearing.date)}${nextHearing.time ? `, ${formatTime(nextHearing.time)}` : ""}`;

  return (
    <main className="min-h-svh bg-background font-sans text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3.5 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

        {/* Desktop info row */}
        <div className="hidden items-start gap-7 border-b-[0.5px] border-border pt-2.5 pb-3.5 lg:flex">
          <InfoItem icon={User} label="Client" value={mockClient.name} accent />
          <InfoItem icon={Building2} label="Court" value={mockCase.court_name} />
          <InfoItem icon={CalendarClock} label="Next hearing" value={nextHearingLabel} accent />
        </div>

        {/* Mobile-only stack */}
        <div className="flex flex-col gap-3.5 lg:hidden">
          <div className={cn(card, "border-l-[3px] border-l-indigo-600 p-4")}>
            <div className="flex items-center gap-1.5 text-indigo-600">
              <CalendarClock className="size-4" aria-hidden={true} />
              <p className="text-[11px] font-normal tracking-wide uppercase">Next hearing</p>
            </div>
            <p className="mt-1 text-[18px] font-semibold text-foreground">{nextHearingLabel}</p>
          </div>

          <NextActionStrip />

          <div className="grid grid-cols-2 gap-3">
            <div className={cn(card, "p-4")}>
              <InfoItem icon={User} label="Client" value={mockClient.name} accent />
            </div>
            <div className={cn(card, "p-4")}>
              <InfoItem icon={Building2} label="Court" value={mockCase.court_name} />
            </div>
          </div>

          <HearingsCard limit={2} />
          <DocumentsCard />
          <FollowUpsCard />
          <CaseDetailsCard />
          <NotesCard />
          <RecentActivityCard />
        </div>

        {/* Desktop grid: left 1fr / middle 1.25fr / right 1fr */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start lg:gap-3">
          <CaseDetailsCard />

          <div className="flex min-w-0 flex-col gap-3">
            <NextActionStrip />
            <HearingsCard limit={3} />
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <DocumentsCard />
            <FollowUpsCard />
            <NotesCard />
          </div>
        </div>
      </div>
    </main>
  );
}

function Header({
  menuOpen,
  setMenuOpen,
}: {
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
}) {
  return (
    <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          aria-label="Back to cases"
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-[18px]" aria-hidden={true} />
        </button>
        <h2 className="min-w-0 truncate text-[22px] font-bold tracking-tight">{mockCase.title}</h2>
        <span className="shrink-0 text-[12px] text-muted-foreground">{mockCase.case_number}</span>
      </div>

      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        <StatusBadge status={mockCase.status} />
        <PrimaryButton />
        <OverflowMenu open={menuOpen} setOpen={setMenuOpen} />
      </div>

      <div className="flex items-center gap-2 lg:hidden">
        <StatusBadge status={mockCase.status} />
        <PrimaryButton className="flex-1" />
        <OverflowMenu open={menuOpen} setOpen={setMenuOpen} />
      </div>
    </header>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border-[0.5px] border-emerald-400 px-3 py-[5px] text-[12px] font-medium text-emerald-700 capitalize">
      {status}
    </span>
  );
}

function PrimaryButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-indigo-600 px-3.5 py-[7px] text-[12px] font-medium whitespace-nowrap text-white shadow-sm transition-all duration-150 hover:bg-indigo-700 active:scale-[0.97] active:bg-indigo-800",
        className,
      )}
    >
      Record hearing update
    </button>
  );
}

function OverflowMenu({ open, setOpen }: { open: boolean; setOpen: (value: boolean) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, setOpen]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="grid size-8 shrink-0 place-items-center rounded-full border-[0.5px] border-border bg-background text-muted-foreground transition-colors hover:bg-muted"
      >
        <MoreHorizontal className="size-4" aria-hidden={true} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-20 mt-2 w-56 overflow-hidden rounded-[12px] border-[0.5px] border-border bg-popover p-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] font-medium hover:bg-muted"
          >
            <Plus className="size-4 text-muted-foreground" aria-hidden={true} />
            Add follow-up
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] font-medium hover:bg-muted"
          >
            <Upload className="size-4 text-muted-foreground" aria-hidden={true} />
            Upload document
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] font-medium hover:bg-muted"
          >
            <Pencil className="size-4 text-muted-foreground" aria-hidden={true} />
            Edit case details
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" aria-hidden={true} />
            Archive case
          </button>
        </div>
      ) : null}
    </div>
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
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          accent
            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
            : "bg-muted text-muted-foreground",
        )}
      >
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

function NextActionStrip() {
  return (
    <div className={cn(card, "flex items-center justify-between gap-3 bg-amber-50 px-4 py-2.5")}>
      <div className="min-w-0">
        <p className="text-[11px] font-normal text-amber-700">Next action</p>
        <p className="mt-1 truncate text-[13px] font-medium text-foreground">{pendingAction.title}</p>
      </div>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1 rounded-full border-[0.5px] border-amber-300 bg-background px-2.5 py-[5px] text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-100"
      >
        <Check className="size-3" aria-hidden={true} />
        Mark done
      </button>
    </div>
  );
}

function HearingsCard({ limit }: { limit: number }) {
  const visible = mockHearings.slice(0, limit);

  return (
    <div className={cn(card, "p-4")}>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium">Hearings</span>
        <button type="button" className={link}>
          Full timeline
        </button>
      </div>
      {visible.map((hearing, index) => (
        <div key={hearing.id} className={cn("flex gap-2.5", index < visible.length - 1 ? "mb-3.5" : "")}>
          <div className="flex shrink-0 flex-col items-center">
            <span
              className={cn(
                "shrink-0 rounded-full",
                hearing.upcoming ? "mt-[3px] size-2.5 bg-indigo-600" : "mt-1 size-2 bg-muted-foreground/40",
              )}
            />
            {index < visible.length - 1 ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
          </div>
          <div className="min-w-0 pb-1">
            <p className={cn("text-[12px] font-medium", hearing.upcoming ? "text-indigo-700" : "text-foreground")}>
              {formatDate(hearing.date)}
              {hearing.time ? `, ${formatTime(hearing.time)}` : ""}
              {hearing.upcoming ? " · upcoming" : ""}
            </p>
            <p className="mt-1 text-[12px] font-normal text-muted-foreground">{hearing.purpose ?? hearing.notes}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentsCard() {
  return (
    <div className={cn(card, "p-4")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium">
          Documents <span className="text-muted-foreground">· {documentCount}</span>
        </span>
        <button type="button" className={link}>
          View all
        </button>
      </div>
      {mockDocuments.map((document) => (
        <button
          key={document.id}
          type="button"
          className="group -mx-2 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-[5px] text-left transition-colors hover:bg-muted"
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate text-[12px] font-medium">
            <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden={true} />
            <span className="truncate">{document.name}</span>
          </span>
          <ChevronRight
            className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden={true}
          />
        </button>
      ))}
    </div>
  );
}

function FollowUpsCard() {
  return (
    <div className={cn(card, "p-4")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium">
          Follow-ups <span className="text-muted-foreground">· {followUpCount}</span>
        </span>
        <button type="button" className={link}>
          View all
        </button>
      </div>
      {mockFollowUps.map((followUp) => (
        <button
          key={followUp.id}
          type="button"
          className="group -mx-2 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-[5px] text-left transition-colors hover:bg-muted"
        >
          <span className="min-w-0 truncate text-[12px] font-medium">{followUp.title}</span>
          <ChevronRight
            className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden={true}
          />
        </button>
      ))}
    </div>
  );
}

function CaseDetailsCard() {
  const rows: [string, string][] = [
    ["Case type", mockCase.case_type],
    ["CNR number", mockCase.cnr_number],
    ["Filing date", formatDate(mockCase.filing_date)],
  ];

  return (
    <div className={cn(card, "p-4")}>
      <div className="mb-2.5 flex items-center gap-1.5">
        <ClipboardList className="size-[15px] text-muted-foreground" aria-hidden={true} />
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
      <button type="button" className={cn(link, "inline-flex items-center gap-1")}>
        Edit case details
        <ArrowRight className="size-[11px]" aria-hidden={true} />
      </button>
    </div>
  );
}

function NotesCard() {
  return (
    <div className={cn(card, "p-4")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium">Notes</span>
        <button type="button" className={link}>
          Edit
        </button>
      </div>
      <p className="text-[12px] leading-5 text-muted-foreground">{mockCase.notes}</p>
    </div>
  );
}

const mockActivity = [
  { id: "a1", label: "Hearing recorded", detail: "08 Jul 2026", icon: CalendarClock },
  { id: "a2", label: "Document uploaded", detail: "Reply.pdf", icon: FileText },
  { id: "a3", label: "Follow-up added", detail: "Draft rejoinder", icon: CheckSquare2 },
];

function RecentActivityCard() {
  return (
    <div className={cn(card, "p-4")}>
      <span className="text-[12px] font-medium">Recent activity</span>
      <div className="mt-2.5">
        {mockActivity.map((activity, index) => (
          <div
            key={activity.id}
            className={cn("flex items-start gap-2.5 py-2", index > 0 ? hairline : "")}
          >
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <activity.icon className="size-3.5" aria-hidden={true} />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-foreground">{activity.label}</p>
              <p className="mt-1 truncate text-[11px] font-normal text-muted-foreground">{activity.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
