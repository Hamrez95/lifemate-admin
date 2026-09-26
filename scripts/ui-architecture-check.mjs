import { readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const canonicalTokenSource = "app/design-system.css";

// These files are the temporary migration registry for legacy feature styling.
// New CSS modules must use semantic tokens instead of adding another exception.
const legacyRawColorFiles = new Set([
  "app/analytics/analytics.module.css",
  "app/analytics/cohorts/cohorts-reference.module.css",
  "app/analytics/cohorts/cohorts.module.css",
  "app/analytics/funnel/funnel.module.css",
  "app/commerce/catalog/catalog-v2.module.css",
  "app/commerce/commerce-reference.module.css",
  "app/commerce/commerce.module.css",
  "app/commerce/detail.module.css",
  "app/commerce/entitlements/adjustments/adjustments.module.css",
  "app/commerce/operations/operations.module.css",
  "app/commerce/plans/catalog.module.css",
  "app/commerce/promotions/promotions.module.css",
  "app/commerce/transactions/[transactionId]/transaction-detail.module.css",
  "app/commerce/transactions/transactions.module.css",
  "app/finance/scenario/scenario-form.module.css",
  "app/marketing/content-calendar/calendar.module.css",
  "app/marketing/content-studio/studio.module.css",
  "app/marketing/marketing.module.css",
  "app/marketing/media-inbox/media-inbox.module.css",
  "app/offline/offline.module.css",
  "app/privacy/privacy.module.css",
  "app/relationships/ledger/ledger.module.css",
  "app/security/abuse/abuse.module.css",
  "app/security/audit/audit.module.css",
  "app/security/break-glass/break-glass.module.css",
  "app/security/elevated-health/elevated-health.module.css",
  "app/security/retention/retention.module.css",
  "app/security/roles/[roleCode]/role-detail.module.css",
  "app/security/roles/[roleCode]/staff-membership-controls.module.css",
  "app/security/security-layout.module.css",
  "app/security/security.module.css",
  "app/security/staff/staff.module.css",
  "app/standalone-state.module.css",
  "app/support/[ticketId]/ticket-detail.module.css",
  "app/users/[accountId]/product-version-context.module.css",
  "app/users/[accountId]/user-action-menu.module.css",
  "app/users/[accountId]/user-detail.module.css",
  "app/users/[accountId]/user-privacy-reference.module.css",
  "src/components/security/security-context-header.module.css",
  "src/components/shell/global-command-palette.module.css",
  "src/components/shell/notification-center.module.css",
]);

const genericSelectorPattern =
  /\.(?:section-card|notice-banner|metric-card|table-card|state-card|empty-state|loading-state|button|input|select|textarea)(?=[\s:{._-])/u;
const rawColorPattern = /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/iu;
const physicalDirectionPattern = /\b(?:left|right)\s*:/iu;
const tokenDeclarationPattern = /^\s*--lm-[a-z0-9-]+\s*:/imu;

async function findStylesheets(directory) {
  const entries = await (
    await import("node:fs/promises")
  ).readdir(directory, {
    withFileTypes: true,
  });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findStylesheets(path)));
    } else if (entry.isFile() && [".css", ".scss"].includes(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
}

export function scanStylesheet(relativePath, contents) {
  const issues = [];
  const isModule = relativePath.endsWith(".module.css");
  const isFeatureModule = isModule && !relativePath.startsWith("src/components/ui/");

  if (relativePath !== canonicalTokenSource && tokenDeclarationPattern.test(contents)) {
    issues.push("declares --lm-* tokens outside app/design-system.css");
  }

  if (isFeatureModule && physicalDirectionPattern.test(contents)) {
    issues.push("uses physical left/right; prefer logical properties");
  }

  if (isFeatureModule && genericSelectorPattern.test(contents)) {
    issues.push("defines a generic UI selector; compose a canonical primitive instead");
  }

  if (isFeatureModule && rawColorPattern.test(contents) && !legacyRawColorFiles.has(relativePath)) {
    issues.push("adds a raw color outside the temporary migration registry");
  }

  return issues;
}

export async function runUiArchitectureCheck() {
  const files = [
    ...(await findStylesheets(join(root, "app"))),
    ...(await findStylesheets(join(root, "src"))),
  ];
  const failures = [];

  for (const file of files) {
    const relativePath = relative(root, file).replaceAll("\\", "/");
    const contents = await readFile(file, "utf8");
    for (const issue of scanStylesheet(relativePath, contents)) {
      failures.push(`${relativePath}: ${issue}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`UI architecture guard failed:\n${failures.join("\n")}`);
  }

  return {
    stylesheetCount: files.length,
    legacyRawColorFileCount: legacyRawColorFiles.size,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runUiArchitectureCheck();
    console.log(
      `UI architecture guard passed: ${result.stylesheetCount} stylesheets scanned; ${result.legacyRawColorFileCount} legacy files remain registered for migration.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
