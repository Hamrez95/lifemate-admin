import { createHash, randomInt } from "node:crypto";

import {
  type MarketingContestDrawRecord,
  type MarketingContestEligibilitySnapshot,
  type MarketingContestSnapshotEntry,
} from "./marketing-contest-contract";

export type MarketingContestRandomIndex = (upperExclusive: number) => number;

function stableSnapshotPayload(snapshot: MarketingContestEligibilitySnapshot): string {
  return JSON.stringify({
    contestId: snapshot.contestId,
    contestRevision: snapshot.contestRevision,
    rulesVersion: snapshot.rulesVersion,
    policyVersion: snapshot.policyVersion,
    frozenAtUtc: snapshot.frozenAtUtc,
    entries: [...snapshot.entries].sort((a, b) => a.entryId.localeCompare(b.entryId)),
  });
}

export function marketingContestSnapshotChecksum(
  snapshot: Omit<MarketingContestEligibilitySnapshot, "checksumSha256">,
): string {
  return createHash("sha256")
    .update(stableSnapshotPayload(snapshot as MarketingContestEligibilitySnapshot))
    .digest("hex");
}

function secureRandomIndex(upperExclusive: number): number {
  return randomInt(0, upperExclusive);
}

function drawWithoutReplacement(
  entries: MarketingContestSnapshotEntry[],
  total: number,
  randomIndex: MarketingContestRandomIndex,
): MarketingContestSnapshotEntry[] {
  const pool = [...entries];
  const chosen: MarketingContestSnapshotEntry[] = [];
  while (chosen.length < total && pool.length > 0) {
    const index = randomIndex(pool.length);
    if (!Number.isInteger(index) || index < 0 || index >= pool.length) {
      throw new Error("contest_random_index_out_of_range");
    }
    const [entry] = pool.splice(index, 1);
    if (entry) chosen.push(entry);
  }
  return chosen;
}

export function drawMarketingContestWinners(
  snapshot: MarketingContestEligibilitySnapshot,
  input: {
    drawId: string;
    winnerCount: number;
    alternateCount: number;
    drawnAtUtc: string;
    drawnByActorId: string;
    redrawOfDrawId?: string | null;
    redrawReason?: string | null;
  },
  randomIndex: MarketingContestRandomIndex = secureRandomIndex,
): MarketingContestDrawRecord {
  if (snapshot.entries.length < input.winnerCount) {
    throw new Error("contest_not_enough_eligible_entries");
  }
  if (!Number.isInteger(input.winnerCount) || input.winnerCount < 1) {
    throw new Error("contest_invalid_winner_count");
  }
  if (!Number.isInteger(input.alternateCount) || input.alternateCount < 0) {
    throw new Error("contest_invalid_alternate_count");
  }

  const selected = drawWithoutReplacement(
    snapshot.entries,
    Math.min(snapshot.entries.length, input.winnerCount + input.alternateCount),
    randomIndex,
  );
  const winners = selected.slice(0, input.winnerCount);
  const alternates = selected.slice(input.winnerCount);

  return {
    drawId: input.drawId,
    snapshotId: snapshot.snapshotId,
    algorithmVersion: "contest-draw.v1",
    randomSource: "node_crypto_random_int",
    requestedWinnerCount: input.winnerCount,
    requestedAlternateCount: input.alternateCount,
    selectedEntryIds: winners.map((entry) => entry.entryId),
    alternateEntryIds: alternates.map((entry) => entry.entryId),
    drawnAtUtc: input.drawnAtUtc,
    drawnByActorId: input.drawnByActorId,
    redrawOfDrawId: input.redrawOfDrawId ?? null,
    redrawReason: input.redrawReason ?? null,
  };
}
