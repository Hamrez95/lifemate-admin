import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = readFileSync("run-main.ps1", "utf8");

describe("run-main PowerShell launcher", () => {
  it("protects uncommitted work before changing branches", () => {
    expect(script).toContain("git status --porcelain");
    expect(script).toContain("never resets, stashes, or overwrites work");
    expect(script).not.toMatch(/git\s+reset|git\s+stash/u);
  });

  it("fast-forwards main, validates Node, and starts a loopback dev server", () => {
    expect(script).toContain("fetch origin main");
    expect(script).toContain("switch main");
    expect(script).toContain("pull --ff-only origin main");
    expect(script).toContain('[version]"20.9.0"');
    expect(script).toContain("--hostname 127.0.0.1 --port $Port");
  });

  it("supports safe install and browser controls", () => {
    expect(script).toContain("[switch]$Install");
    expect(script).toContain("[switch]$NoBrowser");
    expect(script).toContain("npm ci --no-audit --no-fund");
  });
});
