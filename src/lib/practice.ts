import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

export type CurrentPractice = {
  id: string;
  name: string;
  role: string;
};

export async function getCurrentPractice(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CurrentPractice | null> {
  const { data, error } = await supabase
    .from("practice_members")
    .select("practice_id, role")
    .eq("user_id", userId)
    .order("practice_id")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const { data: practice, error: practiceError } = await supabase
    .from("practices")
    .select("id, name")
    .eq("id", data.practice_id)
    .maybeSingle();

  if (practiceError || !practice) {
    return null;
  }

  return {
    id: practice.id,
    name: practice.name,
    role: data.role,
  };
}

export async function getAuthenticatedDestination(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const practice = await getCurrentPractice(supabase, userId);
  return practice ? "/dashboard" : "/onboarding";
}
