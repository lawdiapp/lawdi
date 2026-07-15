"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentPractice } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export type OnboardingActionState = {
  error?: string;
  fieldError?: string;
};

function safeDatabaseError(code?: string, message?: string) {
  const normalized = message?.toLowerCase() ?? "";

  if (code === "23505" || normalized.includes("already belongs")) {
    return "Your account is already connected to a practice.";
  }

  return "We could not create your practice. Please try again.";
}

export async function createPractice(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const practiceName = String(formData.get("practiceName") ?? "").trim();

  if (!practiceName) {
    return { fieldError: "Enter your practice name." };
  }

  if (practiceName.length > 120) {
    return { fieldError: "Practice name must be 120 characters or fewer." };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const existingPractice = await getCurrentPractice(
    supabase,
    claimsData.claims.sub,
  );

  if (existingPractice) {
    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  const { error } = await supabase.rpc("create_practice_with_owner", {
    practice_name: practiceName,
  });

  if (error) {
    return { error: safeDatabaseError(error.code, error.message) };
  }

  const createdPractice = await getCurrentPractice(
    supabase,
    claimsData.claims.sub,
  );

  if (!createdPractice) {
    return { error: "Your practice was created, but we could not load it. Please refresh the page." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
