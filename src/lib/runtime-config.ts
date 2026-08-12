export type PublicRuntimeConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  adminApiUrl: string;
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
  return {
    supabaseUrl: httpsOrLocalhost(
      "NEXT_PUBLIC_SUPABASE_URL",
      required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    ),
    supabasePublishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    adminApiUrl: httpsOrLocalhost(
      "NEXT_PUBLIC_ADMIN_API_URL",
      required("NEXT_PUBLIC_ADMIN_API_URL", process.env.NEXT_PUBLIC_ADMIN_API_URL),
    ),
  };
}
