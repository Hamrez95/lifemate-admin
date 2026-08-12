"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export function createBrowserSupabaseClient() {
  const config = getPublicRuntimeConfig();
  return createBrowserClient(config.supabaseUrl, config.supabasePublishableKey);
}
