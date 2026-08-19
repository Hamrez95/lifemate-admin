export type PublicRuntimeConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  adminApiUrl: string;
  adminAuthUrl: string;
};

function required(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${name} is required for LifeMate Command Center.`);
  }
  return normalized;
}

function httpsOrLocalhost(name: string, value: string): string {
  const parsed = new URL(value);
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !local) {
    throw new Error(`${name} must use HTTPS outside localhost.`);
  }
  return parsed.toString().replace(/\/$/, "");
}

export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  const supabaseUrl = httpsOrLocalhost(
    "NEXT_PUBLIC_SUPABASE_URL",
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  );

  return {
    supabaseUrl,
    supabasePublishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    adminApiUrl: httpsOrLocalhost(
      "NEXT_PUBLIC_ADMIN_API_URL",
      required("NEXT_PUBLIC_ADMIN_API_URL", process.env.NEXT_PUBLIC_ADMIN_API_URL),
    ),
    // Keep workforce authentication same-origin in the browser. The server route
    // forwards to the public Supabase Edge Function without exposing the browser
    // to cross-origin preflight/CORS failures.
    adminAuthUrl: "/api/auth/workforce",
  };
}
