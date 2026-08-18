import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const launcher = readFileSync("desktop/LifeMateCommandCenter/Program.cs", "utf8");
const workflow = readFileSync(".github/workflows/windows-desktop.yml", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");
const readme = readFileSync("desktop/WINDOWS_README.txt", "utf8");

describe("Windows desktop security contract", () => {
  it("builds the same Next app as a standalone server", () => {
    expect(nextConfig).toContain('output: "standalone"');
    expect(workflow).toContain(".next/standalone");
    expect(workflow).toContain("npm ci --no-audit --no-fund");
  });

  it("binds the packaged server to loopback only", () => {
    expect(launcher).toContain('startInfo.Environment["HOSTNAME"] = "127.0.0.1"');
    expect(launcher).toContain("new TcpListener(IPAddress.Loopback, 0)");
    expect(launcher).not.toContain("0.0.0.0");
  });

  it("packages only public Supabase/Admin API configuration", () => {
    expect(workflow).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(workflow).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(workflow).toContain("NEXT_PUBLIC_ADMIN_API_URL");
    expect(workflow).not.toMatch(
      /SUPABASE_SERVICE_ROLE|SERVICE_ROLE_KEY|DATABASE_URL|DB_PASSWORD/u,
    );
    expect(launcher).toContain('StartsWith("sb_publishable_"');
  });

  it("fails closed if privileged configuration appears in the desktop package", () => {
    expect(launcher).toContain('"service_role"');
    expect(launcher).toContain('"database_url"');
    expect(launcher).toContain('"db_password"');
    expect(launcher).toContain("Unsafe privileged configuration was detected");
  });

  it("keeps the canonical hosted API on HTTPS and the same Supabase project", () => {
    expect(launcher).toContain("supabaseUri.Scheme != Uri.UriSchemeHttps");
    expect(launcher).toContain("adminApiUri.Scheme != Uri.UriSchemeHttps");
    expect(launcher).toContain("adminApiUri.Host, supabaseUri.Host");
    expect(workflow).toContain(
      "https://bwdvmniywyyijjauipnh.supabase.co/functions/v1/lifemate-admin-api",
    );
  });

  it("documents the unsigned test-build boundary", () => {
    expect(readme).toContain("intentionally unsigned");
    expect(readme).toContain("service-role key");
    expect(readme).toContain("loopback-only");
  });
});
