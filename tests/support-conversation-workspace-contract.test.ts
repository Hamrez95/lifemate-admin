import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const client = readFileSync(join(root, "src/lib/admin-api/support-conversation.ts"), "utf8");
const page = readFileSync(join(root, "app/support/[ticketId]/conversation/page.tsx"), "utf8");
const panel = readFileSync(
  join(root, "app/support/[ticketId]/SupportConversationPanel.tsx"),
  "utf8",
);
const actions = readFileSync(join(root, "app/support/[ticketId]/conversation-actions.ts"), "utf8");

describe("Support conversation workspace contract", () => {
  it("uses only the canonical server-side Admin API support contract", () => {
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/support/tickets/${ticketId}/conversation");
    expect(client).toContain("/conversation/operations");
    expect(client).toContain("/conversation/${suffix}");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("supabase.storage");
  });

  it("keeps support permissions and Admin session checks explicit", () => {
    expect(page).toContain('admin.permissions.includes("support.read")');
    expect(page).toContain('admin.permissions.includes("support.write")');
    expect(page).toContain("requireAdminAccess()");
    expect(actions).toContain("revalidatePath(`/support/${ticketId}`)");
  });

  it("does not invent realtime or public attachment access", () => {
    expect(panel).toContain("polling/refresh");
    expect(panel).toContain("این صفحه ادعای realtime transport نمی‌کند");
    expect(panel).toContain("signed-access");
    expect(panel).toContain("public bucket URL");
    expect(panel).not.toContain("storage.from(");
    expect(panel).not.toContain("getPublicUrl");
  });

  it("keeps escalation and linked references privacy-minimized and idempotent", () => {
    expect(actions).toContain("safeReason.length < 5");
    expect(actions).toContain("/^https?:\\/\\//i.test(referenceCode)");
    expect(panel).toContain('name="idempotencyKey"');
    expect(panel).toContain('name="targetRoleCode"');
    expect(panel).toContain('name="referenceCode"');
  });
});
