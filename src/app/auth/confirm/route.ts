import { NextResponse, type NextRequest } from "next/server";

import { getAuthenticatedDestination } from "@/lib/practice";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code || code.length > 2048) {
    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", request.url),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", request.url),
    );
  }

  const destination = await getAuthenticatedDestination(
    supabase,
    data.user.id,
  );

  return NextResponse.redirect(new URL(destination, request.url));
}
