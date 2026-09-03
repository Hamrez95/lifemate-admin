export type DeploymentParityState = "current" | "behind" | "ahead_or_unknown" | "unverifiable";
export type MigrationCompatibilityState = "compatible" | "incompatible" | "unknown";
export type DeploymentMainSource = "github-server" | "release-input" | "unavailable";

export type DeploymentStatus = {
  environment: string;
  deployedSha: string | null;
  deployedAtUtc: string | null;
  deploymentId: string | null;
  deploymentUrl: string | null;
  expectedMainSha: string | null;
  parityState: DeploymentParityState;
  migrationCompatibility: MigrationCompatibilityState;
  rollbackReference: string | null;
  checkedAtUtc: string;
  mainSource: DeploymentMainSource;
  limitation: string | null;
};

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function normalizeGitSha(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return SHA_PATTERN.test(normalized) ? normalized : null;
}

export function classifyDeploymentParity(input: {
  deployedSha: string | null;
  expectedMainSha: string | null;
  compareStatus?: "ahead" | "behind" | "diverged" | "identical" | null;
}): DeploymentParityState {
  const deployedSha = normalizeGitSha(input.deployedSha);
  const expectedMainSha = normalizeGitSha(input.expectedMainSha);
  if (!deployedSha || !expectedMainSha) return "unverifiable";
  if (deployedSha === expectedMainSha || input.compareStatus === "identical") return "current";

  // GitHub compare is requested as deployed...expected-main. If the head is ahead,
  // production is an ancestor of current main and is therefore behind.
  if (input.compareStatus === "ahead") return "behind";

  // A production SHA ahead of main or a diverged history is never treated as healthy.
  return "ahead_or_unknown";
}

export function shortGitSha(value: string | null): string {
  return normalizeGitSha(value)?.slice(0, 8) ?? "نامشخص";
}
