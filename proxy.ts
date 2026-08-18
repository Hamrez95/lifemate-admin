import type { NextRequest } from "next/server";

import { refreshSupabaseSession } from "@/src/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await refreshSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|offline|pwa-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
