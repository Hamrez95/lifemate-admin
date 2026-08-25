import { describe, expect, it } from "vitest";

import { parseOperationsSnapshot } from "./operations-contract";

const validSnapshot = {
  services: [
    {
      key: "lifemate-admin-api.database",
      state: "ready",
      source: "live-database-health-probe",
      latencyMs: 12.4,
      checkedAtUtc: "2026-08-26T00:00:00.000Z",
    },
  ],
  backgroundJobs: { state: "unknown", source: "not-instrumented" },
  deployments: {
    state: "unknown",
    source: "not-instrumented",
    releaseReference: null,
  },
  providers: { state: "unknown", source: "not-instrumented" },
  incidents: {
    state: "unknown",
    source: "not-instrumented",
    activeCount: null,
  },
  freshness: { status: "fresh", asOfUtc: "2026-08-26T00:00:00.000Z" },
};

describe("parseOperationsSnapshot", () => {
  it("accepts observed readiness while preserving unknown telemetry", () => {
    const parsed = parseOperationsSnapshot(validSnapshot);
    expect(parsed?.services[0].state).toBe("ready");
    expect(parsed?.backgroundJobs.state).toBe("unknown");
    expect(parsed?.deployments.releaseReference).toBeNull();
    expect(parsed?.incidents.activeCount).toBeNull();
  });

  it("rejects fabricated negative or malformed operational values", () => {
    expect(
      parseOperationsSnapshot({
        ...validSnapshot,
        incidents: { state: "ready", source: "invented", activeCount: -1 },
      }),
    ).toBeNull();
    expect(
      parseOperationsSnapshot({
        ...validSnapshot,
        services: [{ ...validSnapshot.services[0], latencyMs: "fast" }],
      }),
    ).toBeNull();
  });

  it("rejects unsupported states and missing source evidence", () => {
    expect(
      parseOperationsSnapshot({
        ...validSnapshot,
        providers: { state: "healthy", source: "not-instrumented" },
      }),
    ).toBeNull();
    expect(
      parseOperationsSnapshot({
        ...validSnapshot,
        backgroundJobs: { state: "unknown", source: "" },
      }),
    ).toBeNull();
  });
});
