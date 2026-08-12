import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export async function refreshSupabaseSession(request: NextRequest) {
  const config = getPublicRuntimeConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Supabase recommends getClaims() here rather than trusting getSession() in
  // server-side request interception. It validates the token before continuing.
  await supabase.auth.getClaims();
  return response;
}
