import { cache } from "react";

import { createServerSupabaseClient } from "@/src/lib/supabase/server";

/**
 * Resolve the verified bearer token once per server render. Dashboard cards are
 * loaded in parallel; without this cache each card repeated the same Auth
 * claims and session round trips before calling the Admin API.
 */
export const getServerAdminAccessToken = cache(async (): Promise<string | null> => {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
});
