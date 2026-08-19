import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/src/lib/supabase/server";

function noStoreRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return noStoreRedirect(new URL("/login?auth=failed", requestUrl.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return noStoreRedirect(new URL("/login?auth=failed", requestUrl.origin));
  }

  return noStoreRedirect(new URL("/login", requestUrl.origin));
}
