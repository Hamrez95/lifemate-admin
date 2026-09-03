import "server-only";

import {
  classifyDeploymentParity,
  type DeploymentMainSource,
  type DeploymentStatus,
  normalizeGitSha,
} from "./deployment-status-contract";

type GithubCommitResponse = { sha?: unknown };
type GithubCompareResponse = { status?: unknown };

const DEFAULT_REPOSITORY = "Hamrez95/lifemate-admin";
const GITHUB_CACHE_SECONDS = 300;

function repositoryName(): string {
  const configured = process.env.LIFEMATE_ADMIN_REPOSITORY?.trim();
  return configured && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(configured)
    ? configured
    : DEFAULT_REPOSITORY;
}

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "LifeMate-Command-Center",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_READ_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function githubJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repositoryName()}${path}`, {
      headers: githubHeaders(),
      next: { revalidate: GITHUB_CACHE_SECONDS },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function expectedMainSha(): Promise<{
  sha: string | null;
  source: DeploymentMainSource;
}> {
  const releaseInput = normalizeGitSha(process.env.LIFEMATE_ADMIN_EXPECTED_MAIN_SHA);
  if (releaseInput) return { sha: releaseInput, source: "release-input" };

  const response = await githubJson<GithubCommitResponse>("/commits/main");
  const sha = normalizeGitSha(typeof response?.sha === "string" ? response.sha : null);
  return sha ? { sha, source: "github-server" } : { sha: null, source: "unavailable" };
}

async function compareDeploymentToMain(
  deployedSha: string,
  mainSha: string,
): Promise<"ahead" | "behind" | "diverged" | "identical" | null> {
  if (deployedSha === mainSha) return "identical";
  const response = await githubJson<GithubCompareResponse>(
    `/compare/${encodeURIComponent(deployedSha)}...${encodeURIComponent(mainSha)}`,
  );
  const status = response?.status;
  return status === "ahead" || status === "behind" || status === "diverged" || status === "identical"
    ? status
    : null;
}

function validIsoTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export async function getDeploymentStatus(): Promise<DeploymentStatus> {
  const checkedAtUtc = new Date().toISOString();
  const deployedSha =
    normalizeGitSha(process.env.VERCEL_GIT_COMMIT_SHA) ??
    normalizeGitSha(process.env.LIFEMATE_ADMIN_RELEASE_SHA) ??
    normalizeGitSha(process.env.NEXT_PUBLIC_RELEASE_COMMIT);
  const main = await expectedMainSha();
  const compareStatus =
    deployedSha && main.sha ? await compareDeploymentToMain(deployedSha, main.sha) : null;
  const parityState = classifyDeploymentParity({
    deployedSha,
    expectedMainSha: main.sha,
    compareStatus,
  });

  const environment =
    process.env.VERCEL_TARGET_ENV?.trim() || process.env.VERCEL_ENV?.trim() || "development";
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID?.trim() || null;
  const deploymentHost = process.env.VERCEL_URL?.trim() || null;

  let limitation: string | null = null;
  if (!deployedSha) limitation = "شناسه immutable نسخه deploy‌شده در runtime موجود نیست.";
  else if (!main.sha)
    limitation = "شناسه current main از منبع server-side قابل تأیید نبود؛ وضعیت سالم فرض نمی‌شود.";
  else if (deployedSha !== main.sha && !compareStatus)
    limitation = "رابطه ancestry بین نسخه Production و current main قابل تأیید نبود.";

  return {
    environment,
    deployedSha,
    deployedAtUtc: validIsoTimestamp(process.env.LIFEMATE_ADMIN_DEPLOYED_AT_UTC),
    deploymentId,
    deploymentUrl: deploymentHost ? `https://${deploymentHost}` : null,
    expectedMainSha: main.sha,
    parityState,
    migrationCompatibility: "unknown",
    rollbackReference: process.env.LIFEMATE_ADMIN_ROLLBACK_REFERENCE?.trim() || null,
    checkedAtUtc,
    mainSource: main.source,
    limitation,
  };
}
