import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Circle Command Center contract", () => {
  it("uses only the canonical server-side Admin API", () => {
    const api = source("src/lib/admin-api/circles.ts");

    expect(api).toContain('import "server-only"');
    expect(api).toContain("getServerAdminAccessToken");
    expect(api).toContain("/api/v1/circles");
    expect(api).not.toContain(".from(");
    expect(api).not.toContain("service_role");
    expect(api).not.toContain("SUPABASE_SERVICE_ROLE");
    expect(api).not.toContain("network.circles");
    expect(api).not.toContain("network.circle_members");
  });

  it("fails closed unless the Core response declares structure-only privacy", () => {
    const api = source("src/lib/admin-api/circles.ts");

    expect(api).toContain('privacy.scope !== "structure_only"');
    expect(api).toContain("privacy.protectedHealthContentIncluded !== false");
    expect(api).toContain("parseCircleDirectoryResponse");
    expect(api).toContain("parseCircleDetailResponse");
  });

  it("never models raw invitation contact hashes or protected Women Health fields", () => {
    const api = source("src/lib/admin-api/circles.ts");

    for (const prohibited of [
      "inviteeContactHash",
      "invitee_contact_hash",
      "includePeriodWindow",
      "includePhaseContext",
      "includeWellbeingContext",
      "periodDate",
      "fertilityWindow",
      "symptoms",
      "painLevel",
      "privateNotes",
    ]) {
      expect(api).not.toContain(prohibited);
    }
  });

  it("keeps directory and detail behind relationships.read with real empty states", () => {
    const directory = source("app/relationships/circles/page.tsx");
    const detail = source("app/relationships/circles/[circleId]/page.tsx");

    for (const page of [directory, detail]) {
      expect(page).toContain('admin.permissions.includes("relationships.read")');
      expect(page).toContain('activeSlug="relationships"');
      expect(page).not.toContain("service_role");
      expect(page).not.toContain(".from(");
      expect(page).toContain("AdminPageState");
      expect(page).toContain("formatPersianDateTime");
      expect(page).not.toContain("new Intl.DateTimeFormat");
    }

    expect(directory).toContain('state="empty"');
    expect(detail).toContain('state="empty"');
    expect(detail).toContain('invitation.targetKind === "contact"');
  });

  it("exposes Circle navigation only inside the relationships workspace", () => {
    const sidebar = source("src/components/shell/Sidebar.tsx");

    expect(sidebar).toContain('workspace.slug === "relationships"');
    expect(sidebar).toContain('href="/relationships/circles"');
    expect(sidebar).toContain("circlesActive");
    expect(sidebar).toContain("Circleها");
  });
});
