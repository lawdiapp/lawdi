import { ArrowRight, BriefcaseBusiness, CalendarClock, Clock3, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  addDays,
  daysBetween,
  formatDate,
  formatDateShort,
  formatTime,
  getIndiaDateString,
} from "@/lib/dates";
import { getLatestHearingsByCase, type HearingDiaryRow } from "@/lib/hearings";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";
import { accentLink, cardSurface, pillButtonOutline, pillButtonPrimary } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type FollowUpSummary = Pick<
  Database["public"]["Tables"]["follow_ups"]["Row"],
  "id" | "case_id" | "title" | "due_date" | "reminder_at"
>;

type CaseSummary = { id: string; title: string; cnr_number: string | null; court_name: string };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  const practice = await getCurrentPractice(supabase, data.claims.sub);

  if (!practice) {
    redirect("/onboarding");
  }

  const { data: recentCases } = await supabase
    .from("cases")
    .select("id, title, cnr_number")
    .eq("practice_id", practice.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const today = getIndiaDateString();
  const upcomingEnd = addDays(today, 7);
  const [
    { data: hearingRows },
    { data: allCases },
    { data: followUpRows },
  ] = await Promise.all([
    supabase
      .from("hearings")
      .select("id, case_id, hearing_date, hearing_time, notes, next_hearing_date, next_hearing_time, created_at")
      .eq("practice_id", practice.id),
    supabase
      .from("cases")
      .select("id, title, cnr_number, court_name")
      .eq("practice_id", practice.id),
    supabase
      .from("follow_ups")
      .select("id, case_id, title, due_date, reminder_at")
      .eq("practice_id", practice.id)
      .is("completed_at", null)
      .not("due_date", "is", null)
      .lte("due_date", upcomingEnd)
      .order("due_date", { ascending: true }),
  ]);
  const latestHearings = getLatestHearingsByCase(hearingRows ?? []);
  const caseDetails = new Map((allCases ?? []).map((item) => [item.id, item as CaseSummary]));

  const scheduledHearings = Array.from(latestHearings.values())
    .filter((hearing) => {
      const nextDate = hearing.next_hearing_date;
      return nextDate && nextDate >= today && nextDate <= upcomingEnd;
    })
    .sort((left, right) => {
      const leftSchedule = `${left.next_hearing_date}T${left.next_hearing_time ?? "23:59:59"}`;
      const rightSchedule = `${right.next_hearing_date}T${right.next_hearing_time ?? "23:59:59"}`;
      return leftSchedule.localeCompare(rightSchedule);
    });
  const todaysHearings = scheduledHearings.filter(
    (hearing) => hearing.next_hearing_date === today,
  );
  const upcomingHearings = scheduledHearings.filter(
    (hearing) => hearing.next_hearing_date && hearing.next_hearing_date > today,
  );

  const overdueHearings = Array.from(latestHearings.values())
    .filter((hearing) => hearing.next_hearing_date && hearing.next_hearing_date < today)
    .sort((left, right) => (left.next_hearing_date ?? "").localeCompare(right.next_hearing_date ?? ""));

  const datedFollowUps = (followUpRows ?? []) as FollowUpSummary[];
  const overdueFollowUps = datedFollowUps.filter(
    (followUp) => followUp.due_date && followUp.due_date < today,
  );
  const todaysFollowUps = datedFollowUps.filter(
    (followUp) => followUp.due_date === today,
  );

  return (
    <main className="min-h-svh w-full bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
              L
            </span>
            <span className="text-sm font-semibold tracking-tight">Lawdi</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-[13px] font-semibold">{practice.name}</p>
              <p className="text-[11px] capitalize text-muted-foreground">{practice.role}</p>
            </div>
            <div className="h-8 w-px bg-border" aria-hidden="true" />
            <form action={logout}>
              <Button type="submit" variant="outline" className="h-9 rounded-full px-3.5 text-xs">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/cases/new" className={cn(pillButtonPrimary, "h-9 gap-1.5 px-4 text-[13px]")}>
            <Plus className="size-4" aria-hidden="true" />
            Add New Case
          </Link>
          <Link href="/cases" className={cn(pillButtonOutline, "h-9 gap-1.5 px-4 text-[13px]")}>
            <BriefcaseBusiness className="size-4" aria-hidden="true" />
            View cases
          </Link>
        </div>

        {overdueHearings.length ? (
          <section
            className="rounded-[12px] border border-amber-300 bg-amber-50 p-4"
            aria-labelledby="needs-update-heading"
          >
            <div className="mb-3 flex items-center gap-2">
              <TriangleAlert className="size-4 text-amber-700" aria-hidden="true" />
              <h2 id="needs-update-heading" className="text-[13px] font-semibold text-amber-900">
                Needs hearing update · {overdueHearings.length}
              </h2>
            </div>
            <div className="flex flex-col divide-y divide-amber-200">
              {overdueHearings.map((hearing) => {
                const caseRecord = caseDetails.get(hearing.case_id);
                if (!caseRecord || !hearing.next_hearing_date) return null;

                const overdueDate = hearing.next_hearing_date;
                const overdueDays = daysBetween(overdueDate, today);

                return (
                  <div key={hearing.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-foreground">{caseRecord.title}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {caseRecord.cnr_number ?? "No CNR"} · {overdueDays}d overdue
                      </p>
                    </div>
                    <Link
                      href={`/cases/${caseRecord.id}/hearings/new`}
                      scroll={false}
                      aria-label={`Record hearing update for ${caseRecord.title}, hearing was ${formatDate(overdueDate)}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-background px-3 py-1.5 text-[12px] font-medium text-amber-800 transition-colors hover:bg-amber-100"
                    >
                      <CalendarClock className="size-3.5" aria-hidden="true" />
                      {formatDateShort(overdueDate)}
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <HearingListCard
            title="Today"
            dateLabel={formatDate(today)}
            hearings={todaysHearings}
            cases={caseDetails}
            emptyMessage="No hearings scheduled for today."
          />
          <HearingListCard
            title="Upcoming"
            dateLabel="Next 7 days"
            hearings={upcomingHearings}
            cases={caseDetails}
            emptyMessage="No hearings scheduled in the next 7 days."
          />
        </div>

        <div className="flex items-center justify-between gap-3 text-[12px]">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Follow-ups:</span> {overdueFollowUps.length} overdue,{" "}
            {todaysFollowUps.length} due today
          </p>
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center gap-1.5 font-medium text-muted-foreground opacity-60"
          >
            View all
            <span className="text-[10px]">Soon</span>
          </button>
        </div>

        <section aria-labelledby="recent-cases-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="recent-cases-heading" className="text-[13px] font-semibold">
              Recent cases
            </h2>
            <Link href="/cases" className={cn(accentLink, "text-[12px]")}>
              View all
            </Link>
          </div>

          {recentCases?.length ? (
            <div className="flex flex-col gap-2">
              {recentCases.map((item) => (
                <Link
                  key={item.id}
                  href={`/cases/${item.id}`}
                  className={cn(
                    cardSurface,
                    "group flex min-w-0 items-center justify-between gap-3 p-3.5 transition-colors hover:bg-muted/40",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{item.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{item.cnr_number ?? "No CNR"}</p>
                  </div>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className={cn(cardSurface, "border-dashed p-4 text-[12px] leading-6 text-muted-foreground")}>
              No cases yet. Add your first matter to start the practice case list.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function HearingListCard({
  title,
  dateLabel,
  hearings,
  cases,
  emptyMessage,
}: {
  title: string;
  dateLabel: string;
  hearings: HearingDiaryRow[];
  cases: Map<string, CaseSummary>;
  emptyMessage: string;
}) {
  return (
    <div className={cn(cardSurface, "p-4")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        <span className="text-[11px] text-muted-foreground">{dateLabel}</span>
      </div>

      {hearings.length ? (
        <div className="flex flex-col divide-y divide-border">
          {hearings.map((hearing) => {
            const caseRecord = cases.get(hearing.case_id);
            if (!caseRecord || !hearing.next_hearing_date) return null;

            return (
              <Link
                key={hearing.id}
                href={`/cases/${hearing.case_id}`}
                className="group -mx-2 block min-w-0 rounded-lg px-2 py-2.5 transition-colors first:pt-0 last:pb-0 hover:bg-muted"
              >
                <p className="truncate text-[13px] font-medium">{caseRecord.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{caseRecord.cnr_number ?? "No CNR"}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock3 className="size-3 shrink-0" aria-hidden="true" />
                  {formatTime(hearing.next_hearing_time) ?? "Time not set"}
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{caseRecord.court_name}</span>
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );
}
