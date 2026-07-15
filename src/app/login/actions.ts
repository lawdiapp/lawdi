"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedDestination } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
};

function safeLoginError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }

  return "The email or password is incorrect.";
}

export async function login(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fieldErrors: AuthActionState["fieldErrors"] = {};

  if (!email || !email.includes("@")) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Enter your password.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: safeLoginError(error.message) };
  }

  const destination = await getAuthenticatedDestination(
    supabase,
    data.user.id,
  );
  redirect(destination);
}
