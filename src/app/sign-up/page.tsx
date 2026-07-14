import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function SignUpPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      footer={
        <>
          Already have an account?{" "}
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/login">
            Sign in
          </Link>
        </>
      }
    >
      <Card className="gap-6 py-6 shadow-sm sm:py-7">
        <CardHeader className="gap-2 px-5 sm:px-7">
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <CardDescription className="leading-6">
            Start organizing your legal practice with Lawdi.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 sm:px-7">
          <SignUpForm />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
