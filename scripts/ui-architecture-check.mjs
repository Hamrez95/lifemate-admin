import { readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const canonicalTokenSource = "app/design-system.css";

// Route-level raw colors have completed migration. Keep this registry empty so new exceptions require an explicit review.
const legacyRawColorFiles = new Set();

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
