export type OperationalSignalState = "ready" | "unknown" | "unavailable";

export type OperationsSnapshot = {
  services: Array<{
    key: string;
    state: OperationalSignalState;
    source: string;
    latencyMs: number | null;
    checkedAtUtc: string;
  }>;
  backgroundJobs: { state: OperationalSignalState; source: string };
  deployments: {
    state: OperationalSignalState;
    source: string;
    releaseReference: string | null;
  };
  providers: { state: OperationalSignalState; source: string };
  incidents: {
    state: OperationalSignalState;
    source: string;
    activeCount: number | null;
  };
  freshness: { status: "fresh"; asOfUtc: string };
};

const signalStates = new Set<OperationalSignalState>([
  "ready",
  "unknown",
  "unavailable",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function state(value: unknown): OperationalSignalState | null {
  return typeof value === "string" &&
    signalStates.has(value as OperationalSignalState)
    ? (value as OperationalSignalState)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function nullableFiniteNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function nullableNonNegativeInteger(
  value: unknown,
): number | null | undefined {
  if (value === null) return null;
  return Number.isInteger(value) && Number(value) >= 0
    ? Number(value)
    : undefined;
}

export function parseOperationsSnapshot(
  value: unknown,
): OperationsSnapshot | null {
  const root = record(value);
  if (!root || !Array.isArray(root.services) || root.services.length === 0) {
    return null;
  }

  const services: OperationsSnapshot["services"] = [];
  for (const item of root.services) {
    const row = record(item);
    if (!row) return null;
    const key = nonEmptyString(row.key);
    const signalState = state(row.state);
    const source = nonEmptyString(row.source);
    const checkedAtUtc = nonEmptyString(row.checkedAtUtc);
    const latencyMs = nullableFiniteNumber(row.latencyMs);
    if (
      !key ||
      !signalState ||
      !source ||
      !checkedAtUtc ||
      latencyMs === undefined
    ) {
      return null;
    }
    services.push({ key, state: signalState, source, latencyMs, checkedAtUtc });
  }

  const backgroundJobs = record(root.backgroundJobs);
  const deployments = record(root.deployments);
  const providers = record(root.providers);
  const incidents = record(root.incidents);
  const freshness = record(root.freshness);
  if (
    !backgroundJobs ||
    !deployments ||
    !providers ||
    !incidents ||
    !freshness
  ) {
    return null;
  }

  const backgroundJobsState = state(backgroundJobs.state);
  const deploymentsState = state(deployments.state);
  const providersState = state(providers.state);
  const incidentsState = state(incidents.state);
  const backgroundJobsSource = nonEmptyString(backgroundJobs.source);
  const deploymentsSource = nonEmptyString(deployments.source);
  const providersSource = nonEmptyString(providers.source);
  const incidentsSource = nonEmptyString(incidents.source);
  const activeCount = nullableNonNegativeInteger(incidents.activeCount);
  const releaseReference =
    deployments.releaseReference === null
      ? null
      : nonEmptyString(deployments.releaseReference);
  const asOfUtc = nonEmptyString(freshness.asOfUtc);

  if (
    !backgroundJobsState ||
    !deploymentsState ||
    !providersState ||
    !incidentsState ||
    !backgroundJobsSource ||
    !deploymentsSource ||
    !providersSource ||
    !incidentsSource ||
    activeCount === undefined ||
    releaseReference === undefined ||
    freshness.status !== "fresh" ||
    !asOfUtc
  ) {
    return null;
  }

  return {
    services,
    backgroundJobs: { state: backgroundJobsState, source: backgroundJobsSource },
    deployments: {
      state: deploymentsState,
      source: deploymentsSource,
      releaseReference,
    },
    providers: { state: providersState, source: providersSource },
    incidents: {
      state: incidentsState,
      source: incidentsSource,
      activeCount,
    },
    freshness: { status: "fresh", asOfUtc },
  };
}
