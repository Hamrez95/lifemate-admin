"use client";

import { useActionState, useMemo } from "react";

import type { BreakGlassItem } from "@/src/lib/admin-api/break-glass";
import { initialBreakGlassActionState, requestBreakGlass, reviewBreakGlass } from "./actions";

function randomKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

export function BreakGlassRequestForm() {
  const [state, action, pending] = useActionState(requestBreakGlass, initialBreakGlassActionState);
  const key = useMemo(() => randomKey("break-glass-request"), []);

  return (
    <form action={action}>
      <input type="hidden" name="idempotencyKey" value={key} />
      <label>
        <span>Person ID هدف</span>
        <input name="subjectPersonId" required placeholder="UUID دقیق Person" autoComplete="off" />
      </label>
      <label>
        <span>Capability</span>
        <select name="capability" defaultValue="health.read.elevated">
          <option value="health.read.elevated">health.read.elevated</option>
          <option value="women_health.read.elevated">women_health.read.elevated</option>
        </select>
      </label>
      <label>
        <span>TTL (دقیقه)</span>
        <input name="ttlMinutes" type="number" min={5} max={60} defaultValue={15} required />
      </label>
      <label>
        <span>Purpose / Reason</span>
        <textarea name="reason" minLength={10} maxLength={1000} required />
      </label>
      <label>
        <input type="checkbox" name="confirmation" value="confirm-break-glass-request" required />
        <span>تأیید می‌کنم درخواست برای هدف، Person و Capability مشخص و زمان محدود است.</span>
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "در حال ثبت…" : "ثبت درخواست"}
      </button>
      {state.status !== "idle" ? <p role="status">{state.message}</p> : null}
    </form>
  );
}

export function BreakGlassReviewForm({
  item,
  canApprove,
  canRequest,
}: {
  item: BreakGlassItem;
  canApprove: boolean;
  canRequest: boolean;
}) {
  const [state, action, pending] = useActionState(reviewBreakGlass, initialBreakGlassActionState);
  const key = useMemo(() => randomKey(`break-glass-${item.requestId}`), [item.requestId]);
  const canReview = item.status === "Pending" && canApprove;
  const canRevoke = item.status === "Approved" && (canApprove || canRequest);

  if (!canReview && !canRevoke) return null;

  return (
    <form action={action}>
      <input type="hidden" name="requestId" value={item.requestId} />
      <input type="hidden" name="expectedVersion" value={item.version} />
      <input type="hidden" name="idempotencyKey" value={key} />
      <label>
        <span>Action</span>
        <select name="action" defaultValue={canReview ? "approve" : "revoke"}>
          {canReview ? <option value="approve">Approve</option> : null}
          {canReview ? <option value="deny">Deny</option> : null}
          {canRevoke ? <option value="revoke">Revoke</option> : null}
        </select>
      </label>
      <label>
        <span>دلیل تصمیم</span>
        <textarea name="reason" minLength={10} maxLength={1000} required />
      </label>
      <label>
        <input type="checkbox" name="confirmation" value="confirm-break-glass-change" required />
        <span>تأیید می‌کنم target/scope/TTL را بررسی کرده‌ام و این تصمیم Audit می‌شود.</span>
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "در حال ثبت…" : "ثبت تصمیم"}
      </button>
      {state.status !== "idle" ? <p role="status">{state.message}</p> : null}
    </form>
  );
}
