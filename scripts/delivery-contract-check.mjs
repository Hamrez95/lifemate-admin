import { readFile } from "node:fs/promises";

const publicEnvPath = ".env.example";
const workflowPath = ".github/workflows/preview-staging.yml";

const allowedPublicEnv = new Set([
  "NEXT_PUBLIC_ADMIN_API_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
]);

const requiredWorkflowFragments = [
  "pull_request:",
  "workflow_dispatch:",
  "permissions:\n  contents: read",
  "npm ci --no-audit --no-fund",
  "npm run delivery:check",
  "npm run security:check",
  "npm run build",
  "actions/upload-artifact@",
  "retention-days: 3",
  "include-hidden-files: true",
];

const forbiddenWorkflowPatterns = [
  /^\s+[a-z-]+:\s*write\s*$/imu,
  /^\s*environment\s*:/imu,
  /\$\{\{\s*secrets\./iu,
  /\bvercel\s+(?:deploy|--prod)/iu,
  /supabase\s+functions\s+deploy/iu,
  /\bnpm\s+run\s+deploy\b/iu,
];

function fail(message) {
  console.error(`Delivery contract check failed: ${message}`);
  process.exitCode = 1;
}

const envExample = await readFile(publicEnvPath, "utf8");
const envNames = envExample
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/u)?.[1])
  .filter(Boolean);

const unexpectedEnv = envNames.filter((name) => !allowedPublicEnv.has(name));
const missingEnv = [...allowedPublicEnv].filter((name) => !envNames.includes(name));

if (unexpectedEnv.length > 0) {
  fail(`unexpected public env names: ${unexpectedEnv.join(", ")}`);
}
if (missingEnv.length > 0) {
  fail(`required public env names missing: ${missingEnv.join(", ")}`);
}
if (envNames.some((name) => !name.startsWith("NEXT_PUBLIC_"))) {
  fail(".env.example must contain browser-safe NEXT_PUBLIC_* entries only");
}

const workflow = await readFile(workflowPath, "utf8");
for (const fragment of requiredWorkflowFragments) {
  if (!workflow.includes(fragment)) {
    fail(`preview/staging workflow is missing required fragment: ${fragment}`);
  }
}
for (const pattern of forbiddenWorkflowPatterns) {
  if (pattern.test(workflow)) {
    fail(`preview/staging workflow contains forbidden deployment authority: ${pattern}`);
  }
}

const workflowEnvNames = [...workflow.matchAll(/^\s+(NEXT_PUBLIC_[A-Z0-9_]+):/gmu)].map(
  (match) => match[1],
);
const unexpectedWorkflowEnv = workflowEnvNames.filter((name) => !allowedPublicEnv.has(name));
if (unexpectedWorkflowEnv.length > 0) {
  fail(`workflow exposes unexpected public env names: ${unexpectedWorkflowEnv.join(", ")}`);
}

if (!process.exitCode) {
  console.log(
    "Delivery contract passed: preview/staging builds are artifact-only and public env names are allow-listed.",
  );
}
