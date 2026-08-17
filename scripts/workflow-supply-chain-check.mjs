import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const workflowsDir = ".github/workflows";
const immutableRef = /^[0-9a-f]{40}$/u;
const findings = [];

for (const entry of await readdir(workflowsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.ya?ml$/u.test(entry.name)) continue;

  const path = join(workflowsDir, entry.name);
  const content = await readFile(path, "utf8");
  const lines = content.split(/\r?\n/u);

  if (/^\s*pull_request_target\s*:/mu.test(content)) {
    findings.push(`${path}: pull_request_target is forbidden for Admin workflows`);
  }

  if (/\bnpm\s+install(?:\s|$)/iu.test(content)) {
    findings.push(`${path}: use npm ci with the committed lockfile instead of npm install`);
  }

  lines.forEach((line, index) => {
    const match = line.match(/^\s*uses:\s*([^\s@]+)@([^\s#]+)(?:\s+#.*)?$/u);
    if (!match) return;

    const [, action, ref] = match;
    if (action.startsWith("./")) return;
    if (!immutableRef.test(ref)) {
      findings.push(
        `${path}:${index + 1}: external action ${action}@${ref} must be pinned to a full 40-character commit SHA`,
      );
    }
  });
}

if (findings.length > 0) {
  console.error("Workflow supply-chain check failed:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  "Workflow supply-chain check passed: external actions are immutable and installs are lockfile-reproducible.",
);
