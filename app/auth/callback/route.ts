import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?auth=failed", requestUrl.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?auth=failed", requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}
