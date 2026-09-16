import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseSupportMessageMutationSuccess } from "../src/lib/admin-api/support-conversation-mutation-contract";

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

  it("fails closed on malformed or misbound staff-message success", () => {
    const ticketId = "123e4567-e89b-42d3-a456-426614174000";
    const messageId = "123e4567-e89b-42d3-a456-426614174001";
    const canonical = {
      ticketId,
      messageId,
      createdAtUtc: "2026-09-16T12:00:00.000Z",
      replayed: false,
    };

    expect(parseSupportMessageMutationSuccess(canonical, 200, { ticketId })).toEqual({
      messageId,
      createdAtUtc: canonical.createdAtUtc,
      replayed: false,
    });
    expect(
      parseSupportMessageMutationSuccess({ ...canonical, replayed: true }, 200, { ticketId })
        ?.replayed,
    ).toBe(true);
    expect(
      parseSupportMessageMutationSuccess(
        { ...canonical, ticketId: "223e4567-e89b-42d3-a456-426614174000" },
        200,
        { ticketId },
      ),
    ).toBeNull();
    expect(
      parseSupportMessageMutationSuccess({ ...canonical, replayed: "false" }, 200, { ticketId }),
    ).toBeNull();
    expect(parseSupportMessageMutationSuccess(canonical, 201, { ticketId })).toBeNull();
  });

  it("keeps support permissions and Admin session checks explicit", () => {
    expect(page).toContain('admin.permissions.includes("support.read")');
    expect(page).toContain('admin.permissions.includes("support.write")');
    expect(page).toContain("requireAdminAccess()");
    expect(actions).toContain("revalidatePath(\`/support/${ticketId}\`)");
  });

  it("does not invent realtime or public attachment access", () => {
    expect(panel).toContain("polling/refresh");
    expect(panel).toContain("این صفحه ادعای realtime transport نمی‌کند");
    expect(panel).toContain("signed-access");
    expect(panel).toContain("bucket URL");
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

  it("uses the shared semantic tokens and keeps the workspace keyboard-safe", () => {
    const css = readFileSync(
      join(root, "app/support/[ticketId]/support-conversation.module.css"),
      "utf8",
    );

    expect(css).toContain("var(--lm-surface-raised)");
    expect(css).toContain("var(--lm-border)");
    expect(css).toContain("var(--lm-focus)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).not.toContain("var(--surface");
    expect(css).not.toContain("var(--text-muted");
  });
});
