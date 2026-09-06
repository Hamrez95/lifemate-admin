import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceRoots = ["app", "src"];
const sourceExtensions = new Set([".css", ".ts", ".tsx"]);
const cssExtensions = new Set([".css"]);
const ignored = new Set(["node_modules", ".next", "coverage", "graphify-out"]);

async function walk(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    if (ignored.has(entry)) continue;
    const fullPath = resolve(directory, entry);
    const entryStat = await stat(fullPath);
    if (entryStat.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

function extension(file) {
  return file.slice(file.lastIndexOf("."));
}

const allFiles = (
  await Promise.all(sourceRoots.map((directory) => walk(resolve(root, directory))))
).flat();
const sourceFiles = allFiles.filter((file) => sourceExtensions.has(extension(file)));
const cssFiles = sourceFiles.filter((file) => cssExtensions.has(extension(file)));
const relativePath = (file) => relative(root, file).split(sep).join("/");
const contents = new Map(
  await Promise.all(sourceFiles.map(async (file) => [file, await readFile(file, "utf8")])),
);

const colorLiteral = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
const componentPatterns = {
  card: /(?:Card|card)/,
  button: /(?:Button|button)/,
  formControl: /(?:Input|Textarea|Select|Combobox|Checkbox|Radio|Switch)/,
  tableOrList: /(?:Table|table|List|list)/,
  overlay: /(?:Dialog|Drawer|Popover|Tooltip|Menu)/,
  state: /(?:Loading|Empty|Error|Forbidden|Success|Skeleton|Stale|Partial)/,
  navigation: /(?:Sidebar|Topbar|Nav|Tabs|Breadcrumb|AppShell)/,
};

const rawColors = [];
const componentHits = Object.fromEntries(Object.keys(componentPatterns).map((name) => [name, []]));
for (const file of cssFiles) {
  const text = contents.get(file);
  const literals = text.match(colorLiteral) ?? [];
  if (literals.length) rawColors.push({ file: relativePath(file), count: literals.length });
}
for (const file of sourceFiles.filter((candidate) => extension(candidate) !== ".css")) {
  const text = contents.get(file);
  for (const [name, pattern] of Object.entries(componentPatterns)) {
    if (pattern.test(text)) componentHits[name].push(relativePath(file));
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  scope: ["app", "src"],
  counts: {
    sourceFiles: sourceFiles.length,
    cssFiles: cssFiles.length,
    cssModules: cssFiles.filter((file) => file.endsWith(".module.css")).length,
    globalCssFiles: cssFiles.filter((file) => !file.endsWith(".module.css")).length,
    rawColorLiterals: rawColors.reduce((total, entry) => total + entry.count, 0),
  },
  rawColorHotspots: rawColors.sort((a, b) => b.count - a.count),
  componentHitFiles: componentHits,
};

const output = resolve(root, "docs/project/UX_V2_UI_INVENTORY.json");
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${relativePath(output)} (${report.counts.cssFiles} CSS files).`);
