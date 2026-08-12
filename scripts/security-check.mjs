import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["app", "src"];
const files = ["proxy.ts", ".env.example"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs"]);
const forbidden = [
  /SUPABASE_SERVICE_ROLE/i,
  /SERVICE_ROLE_KEY/i,
  /OPENAI_API_KEY/i,
  /postgres(?:ql)?:\/\//i,
  /LIFEMATE_DB_URL/i,
];

async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await walk(child);
    else if (extensions.has(extname(entry.name))) files.push(child);
  }
}

await Promise.all(roots.map(walk));

const findings = [];
for (const path of files) {
  const content = await readFile(path, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(content)) findings.push(`${path}: ${pattern}`);
  }
}

if (findings.length > 0) {
  console.error("Privileged server credential pattern found in browser/admin frontend source:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log("Browser/admin frontend secret-pattern guard passed.");
