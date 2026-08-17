import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const client = readFileSync("src/lib/admin-api/marketing-content-calendar.ts", "utf8");
const page = readFileSync("app/marketing/content-calendar/page.tsx", "utf8");
const actions = readFileSync("app/marketing/content-calendar/actions.ts", "utf8");

describe("ADM-MKT-006 Content Calendar security contract", () => {
  it("keeps calendar and scheduling calls server-only and bounded", () => {
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/marketing/content-calendar");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).toContain("marketingCalendarTimezones");
    expect(client).toContain('"Asia/Tehran"');
    expect(client).toContain('"UTC"');
    expect(client).not.toMatch(
      /OPENAI_API_KEY|DATABASE_URL|SUPABASE_SERVICE_ROLE|accessToken|refreshToken|secretValue/i,
    );
  });

  it("requires human approval and channel readiness before schedule is offered", () => {
    expect(page).toContain('item.approvalState === "Approved"');
    expect(page).toContain('item.channel?.operatorStatus === "Enabled"');
    expect(page).toContain('item.channel.setupStatus === "CredentialAvailable"');
    expect(page).toContain("CredentialAvailable هرگز به معنی Connected نیست");
    expect(page).toContain("Connectivity: NotVerified");
  });

  it("requires both campaign write and high-risk publish capabilities", () => {
    expect(page).toContain('admin.permissions.includes("marketing.campaign.write")');
    expect(page).toContain('admin.permissions.includes("marketing.social.publish")');
    expect(page).toContain("marketing.campaign.write");
    expect(page).toContain("marketing.social.publish");
  });

  it("keeps OutcomeUnknown fail-closed and retries only confirmed Failed executions", () => {
    expect(page).toContain('item.publishStatus === "OutcomeUnknown"');
    expect(page).toContain("Retry خودکار یا دستی از این state در این UI ارائه");
    expect(page).toContain('item.publishStatus === "Failed"');
    expect(actions).toContain("retryMarketingFailedPublish");
  });

  it("cancels only scheduled work and never handles provider credentials in browser actions", () => {
    expect(page).toContain('item.publishStatus === "Scheduled"');
    expect(actions).toContain("cancelMarketingScheduledPublish");
    expect(actions).not.toMatch(/credential|accessToken|refreshToken|apiKey|secret/i);
    expect(actions).toContain("provider call انجام نمی‌شود");
  });

  it("provides an accessible list alternative instead of drag-and-drop-only scheduling", () => {
    expect(page).toContain("safeView(one(raw.view))");
    expect(page).toContain("ListViewSection");
    expect(page).toContain("Drag & drop عمداً در Phase 1 فعال نیست");
    expect(page).toContain('type="datetime-local"');
    expect(page).toContain("Timezone");
  });

  it("makes schedule idempotency explicit for schedule, cancel and retry", () => {
    expect(page).toContain("calendar:schedule:");
    expect(page).toContain("calendar:cancel:");
    expect(page).toContain("calendar:retry:");
    expect(client).toContain('"Idempotency-Key"');
    expect(actions).toContain("همان درخواست زمان‌بندی قبلی بدون duplicate");
  });
});
