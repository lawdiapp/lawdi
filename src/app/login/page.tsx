import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const initialError =
    error === "confirmation_failed"
      ? "We could not confirm that email link. It may be invalid or expired."
      : undefined;

  return (
    <AuthShell
      footer={
        <>
          New to Lawdi?{" "}
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/sign-up">
            Create an account
          </Link>
        </>
      }
    >
      <Card className="gap-6 py-6 shadow-sm sm:py-7">
        <CardHeader className="gap-2 px-5 sm:px-7">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <CardDescription className="leading-6">
            Sign in to manage your practice.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 sm:px-7">
          <LoginForm initialError={initialError} />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
