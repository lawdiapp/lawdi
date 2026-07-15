import { ArrowRight, Bell, BriefcaseBusiness, CalendarDays, Clock3, Plus, Scale } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { addDays, formatDate, formatDateTimeInIndia, formatTime, getIndiaDateString } from "@/lib/dates";
import { getLatestHearingsByCase, type HearingDiaryRow } from "@/lib/hearings";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type FollowUpSummary = Pick<
  Database["public"]["Tables"]["follow_ups"]["Row"],
  "id" | "case_id" | "title" | "due_date" | "reminder_at"
>;

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

  const email =
    typeof data.claims.email === "string" ? data.claims.email : "Your account";

  const { data: recentCases } = await supabase
    .from("cases")
    .select("id, title, case_number, court_name, status")
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
      .select("id, title, case_number")
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
  const caseDetails = new Map((allCases ?? []).map((item) => [item.id, item]));
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
  const datedFollowUps = (followUpRows ?? []) as FollowUpSummary[];
  const overdueFollowUps = datedFollowUps.filter(
    (followUp) => followUp.due_date && followUp.due_date < today,
  );
  const todaysFollowUps = datedFollowUps.filter(
    (followUp) => followUp.due_date === today,
  );
  const upcomingFollowUps = datedFollowUps.filter(
    (followUp) =>
      followUp.due_date &&
      followUp.due_date > today &&
      followUp.due_date <= upcomingEnd,
  );

  return (
    <main className="min-h-svh w-full bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary font-semibold text-primary-foreground">
              L
            </span>
            <div className="min-w-0">
              <p className="font-semibold tracking-tight">Lawdi</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <form action={logout}>
            <Button type="submit" variant="outline" className="h-10 px-4">
              Log out
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <Card className="w-full gap-6 py-7 shadow-sm sm:py-9">
          <CardHeader className="gap-4 px-6 sm:px-9">
            <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Scale className="size-6" aria-hidden="true" />
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome to Lawdi
              </h1>
              <CardDescription className="max-w-xl text-sm leading-6 sm:text-base">
                Simple practice management for advocates
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-6 sm:px-9">
            <div className="grid gap-4 rounded-xl border bg-muted/40 p-4 sm:grid-cols-2 sm:p-5">
              <div>
                <p className="text-sm text-muted-foreground">Practice</p>
                <p className="mt-1 font-medium">{practice.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your role</p>
                <p className="mt-1 font-medium capitalize">{practice.role}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/cases/new"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add case
              </Link>
              <Link
                href="/cases"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
              >
                <BriefcaseBusiness className="size-4" aria-hidden="true" />
                View cases
              </Link>
            </div>

            <section className="mt-8 grid gap-4 border-t pt-6 lg:grid-cols-2" aria-label="Hearing schedule">
              <HearingSchedule
                title="Today’s hearings"
                description={formatDate(today)}
                hearings={todaysHearings}
                cases={caseDetails}
                emptyMessage="No hearings scheduled for today."
              />
              <HearingSchedule
                title="Upcoming hearings"
                description="Next 7 days"
                hearings={upcomingHearings}
                cases={caseDetails}
                emptyMessage="No hearings scheduled in the next 7 days."
              />
            </section>

            <section className="mt-8 border-t pt-6" aria-labelledby="dashboard-follow-ups-heading">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 id="dashboard-follow-ups-heading" className="font-semibold tracking-tight">Follow-ups</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Next actions by due date.</p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Bell className="size-5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <FollowUpSchedule
                  title="Overdue"
                  followUps={overdueFollowUps}
                  cases={caseDetails}
                  emptyMessage="No overdue follow-ups."
                  tone="urgent"
                />
                <FollowUpSchedule
                  title="Due today"
                  followUps={todaysFollowUps}
                  cases={caseDetails}
                  emptyMessage="No follow-ups due today."
                />
                <FollowUpSchedule
                  title="Next 7 days"
                  followUps={upcomingFollowUps}
                  cases={caseDetails}
                  emptyMessage="No follow-ups due in the next 7 days."
                />
              </div>
            </section>

            <section className="mt-8 border-t pt-6" aria-labelledby="recent-cases-heading">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 id="recent-cases-heading" className="font-semibold tracking-tight">
                    Recent cases
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your latest practice matters.
                  </p>
                </div>
                <Link href="/cases" className="text-sm font-medium text-primary hover:underline">
                  View all
                </Link>
              </div>

              {recentCases?.length ? (
                <div className="mt-4 grid gap-3">
                  {recentCases.map((item) => (
                    <Link
                      key={item.id}
                      href={`/cases/${item.id}`}
                      className="group flex min-w-0 items-center justify-between gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/50"
                    >
                      <span className="min-w-0">
                        <span className="block break-words font-medium">{item.title}</span>
                        <span className="mt-1 block break-words text-sm text-muted-foreground">
                          {item.case_number} · {item.court_name}
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed bg-muted/30 p-5 text-sm leading-6 text-muted-foreground">
                  No cases yet. Add your first matter to start the practice case list.
                </div>
              )}
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function FollowUpSchedule({
  title,
  followUps,
  cases,
  emptyMessage,
  tone = "default",
}: {
  title: string;
  followUps: FollowUpSummary[];
  cases: Map<string, { id: string; title: string; case_number: string }>;
  emptyMessage: string;
  tone?: "default" | "urgent";
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <span className={tone === "urgent" && followUps.length ? "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive" : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"}>
          {followUps.length}
        </span>
      </div>
      {followUps.length ? (
        <ul className="mt-3 divide-y">
          {followUps.map((followUp) => {
            const caseRecord = cases.get(followUp.case_id);
            if (!caseRecord || !followUp.due_date) return null;

            return (
              <li key={followUp.id} className="py-2.5 first:pt-0 last:pb-0">
                <Link href={`/cases/${followUp.case_id}`} className="group block min-w-0">
                  <span className="block break-words text-sm font-medium group-hover:underline">{followUp.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatDate(followUp.due_date)} · {caseRecord.title}
                  </span>
                  {followUp.reminder_at ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Reminder {formatDateTimeInIndia(followUp.reminder_at)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );
}

function HearingSchedule({
  title,
  description,
  hearings,
  cases,
  emptyMessage,
}: {
  title: string;
  description: string;
  hearings: HearingDiaryRow[];
  cases: Map<string, { id: string; title: string; case_number: string }>;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <CalendarDays className="size-5" aria-hidden="true" />
        </span>
      </div>

      {hearings.length ? (
        <div className="mt-4 space-y-2">
          {hearings.map((hearing) => {
            const caseRecord = cases.get(hearing.case_id);
            if (!caseRecord || !hearing.next_hearing_date) return null;

            return (
              <Link
                key={hearing.id}
                href={`/cases/${hearing.case_id}`}
                className="group block min-w-0 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <span className="block break-words text-sm font-medium">{caseRecord.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatDate(hearing.next_hearing_date)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {formatTime(hearing.next_hearing_time) ?? "Time not set"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{caseRecord.case_number}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );
}
