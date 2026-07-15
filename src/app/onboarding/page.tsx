import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  const practice = await getCurrentPractice(supabase, data.claims.sub);

  if (practice) {
    redirect("/dashboard");
  }

  return (
    <AuthShell footer="You’ll be added as the owner of this practice.">
      <Card className="gap-6 py-6 shadow-sm sm:py-7">
        <CardHeader className="gap-3 px-5 sm:px-7">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Set up your practice
            </h1>
            <CardDescription className="leading-6">
              Add your practice name to finish setting up Lawdi.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-5 sm:px-7">
          <OnboardingForm />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
