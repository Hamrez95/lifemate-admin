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
  const explicitAdminAuthUrl = process.env.NEXT_PUBLIC_ADMIN_AUTH_URL?.trim();

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
    adminAuthUrl: explicitAdminAuthUrl
      ? httpsOrLocalhost("NEXT_PUBLIC_ADMIN_AUTH_URL", explicitAdminAuthUrl)
      : `${supabaseUrl}/functions/v1/lifemate-admin-auth`,
  };
}
