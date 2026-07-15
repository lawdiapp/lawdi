import { Scale } from "lucide-react";
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

      <div className="mx-auto flex w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <Card className="w-full max-w-2xl gap-6 py-7 shadow-sm sm:py-9">
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
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
