"use server";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export type SignUpActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
};

async function getRequestOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.protocol === "http:" || parsedOrigin.protocol === "https:") {
      return parsedOrigin.origin;
    }
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";

  if (!host || !/^[a-z0-9.:[\]-]+$/i.test(host)) {
    throw new Error("Unable to determine the application URL.");
  }

  return `${protocol === "http" ? "http" : "https"}://${host}`;
}

function safeSignUpError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many sign-up attempts. Please wait a moment and try again.";
  }

  return "We could not create your account. Check your details and try again.";
}

export async function signUp(
  _previousState: SignUpActionState,
  formData: FormData,
): Promise<SignUpActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const fieldErrors: NonNullable<SignUpActionState["fieldErrors"]> = {};

  if (!fullName) {
    fieldErrors.fullName = "Enter your full name.";
  }

  if (!email || !email.includes("@")) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Confirm your password.";
  } else if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const supabase = await createClient();
    const origin = await getRequestOrigin();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: new URL("/auth/confirm", origin).toString(),
      },
    });

    if (error) {
      return { error: safeSignUpError(error.message) };
    }
  } catch {
    return { error: "We could not create your account. Please try again." };
  }

  return { success: true };
}
