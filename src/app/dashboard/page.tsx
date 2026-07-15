import { ArrowRight, BriefcaseBusiness, Plus, Scale } from "lucide-react";
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
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

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
