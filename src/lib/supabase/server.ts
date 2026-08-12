import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export async function createServerSupabaseClient() {
  const config = getPublicRuntimeConfig();
  const cookieStore = await cookies();

  return createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot always write cookies. `proxy.ts` is the
          // authoritative refresh path and will persist rotated sessions.
        }
      },
    },
  });
}
