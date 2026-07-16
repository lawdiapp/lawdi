"use client";

import { CheckSquare2, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { completeFollowUp } from "@/app/cases/[id]/follow-ups/actions";
import { CaseDetailSheet } from "@/components/cases/case-detail-sheet";
import type { FollowUpRow } from "@/components/cases/case-command-center";
import { formatDate, formatDateTimeInIndia } from "@/lib/dates";
import { accentLink, cardSurface } from "@/lib/theme";
import { cn } from "@/lib/utils";

const card = cardSurface;
const link = cn(accentLink, "text-[12px]");

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

export function FollowUpsCard({
  caseId,
  pendingFollowUps,
  completedFollowUps,
  followUpsError,
}: {
  caseId: string;
  pendingFollowUps: FollowUpRow[];
  completedFollowUps: FollowUpRow[];
  followUpsError: boolean;
}) {
  const [open, setOpen] = useState(false);
  const visible = pendingFollowUps.slice(0, 2);

  return (
    <div className={cn(card, "p-4")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium">
          Follow-ups <span className="text-muted-foreground">· {pendingFollowUps.length}</span>
        </span>
        {pendingFollowUps.length ? (
          <button type="button" className={link} onClick={() => setOpen(true)}>
            View all
          </button>
        ) : null}
      </div>

      {followUpsError ? (
        <p className="text-[12px] text-muted-foreground">Follow-ups are unavailable.</p>
      ) : pendingFollowUps.length ? (
        visible.map((followUp) => {
          const state = dueState(followUp.due_date);
          return (
            <button
              key={followUp.id}
              type="button"
              onClick={() => setOpen(true)}
              className="group -mx-2 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-[5px] text-left transition-colors hover:bg-muted"
            >
              <span className="min-w-0 truncate text-[12px] font-medium">{followUp.title}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {state ? (
                  <span className={cn("text-[11px] font-medium", state.className)}>{state.label}</span>
                ) : null}
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </button>
          );
        })
      ) : (
        <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted-foreground">
          <span>No follow-ups yet.</span>
          <Link
            href={`/cases/${caseId}/follow-ups/new`}
            scroll={false}
            className="font-medium text-indigo-700 hover:text-indigo-900"
          >
            Add one
          </Link>
        </div>
      )}

      <CaseDetailSheet
        title="Follow-ups"
        description={`${pendingFollowUps.length} pending`}
        open={open}
        onOpenChange={setOpen}
      >
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Pending</h3>
              <Link
                href={`/cases/${caseId}/follow-ups/new`}
                scroll={false}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add follow-up
              </Link>
            </div>
            {pendingFollowUps.length ? (
              <ul className="divide-y divide-border">
                {pendingFollowUps.map((followUp) => {
                  const state = dueState(followUp.due_date);
                  return (
                    <li
                      key={followUp.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium">{followUp.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {followUp.due_date ? `Due ${formatDate(followUp.due_date)}` : "No due date"}
                          {state ? (
                            <span className={cn("ml-1.5 font-medium", state.className)}>{state.label}</span>
                          ) : null}
                        </p>
                      </div>
                      <form action={completeFollowUp.bind(null, caseId, followUp.id)}>
                        <button
                          type="submit"
                          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <CheckSquare2 className="size-3.5" aria-hidden="true" />
                          Complete
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No pending follow-ups.</p>
            )}
          </div>

          {completedFollowUps.length ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold">Recently completed</h3>
              <ul className="divide-y divide-border">
                {completedFollowUps.map((followUp) => (
                  <li key={followUp.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="break-words text-sm font-medium text-muted-foreground line-through">
                      {followUp.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {followUp.completed_at
                        ? `Completed ${formatDateTimeInIndia(followUp.completed_at)}`
                        : "Completed"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </CaseDetailSheet>
    </div>
  );
}
