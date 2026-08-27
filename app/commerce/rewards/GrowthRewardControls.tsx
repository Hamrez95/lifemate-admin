"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  initialGrowthRewardActionState,
  reviewRewardSourceAction,
  saveRewardRuleAction,
  type GrowthRewardActionState,
} from "./actions";
import styles from "./rewards.module.css";

function useIdempotencyInput(prefix: string, state: GrowthRewardActionState) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handledSuccessRef = useRef<GrowthRewardActionState | null>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    if (!input.value) input.value = `${prefix}-${crypto.randomUUID()}`;
    if (state.status === "success" && handledSuccessRef.current !== state) {
      input.value = `${prefix}-${crypto.randomUUID()}`;
      handledSuccessRef.current = state;
    }
  }, [prefix, state]);

  return inputRef;
}

function Status({ state }: { state: GrowthRewardActionState }) {
  if (state.status === "idle") return null;
  return (
    <p className={styles.feedback} data-status={state.status} role="status">
      {state.message}
    </p>
  );
}

export function RewardRuleForm() {
  const [state, action, pending] = useActionState(
    saveRewardRuleAction,
    initialGrowthRewardActionState,
  );
  const keyRef = useIdempotencyInput("growth-rule", state);
  return (
    <form action={action} className={styles.form}>
      <input ref={keyRef} type="hidden" name="idempotencyKey" />
      <label>
        Rule code
        <input name="code" required pattern="[a-z][a-z0-9._-]{2,79}" dir="ltr" />
      </label>
      <div className={styles.formRow}>
        <label>
          Trigger
          <select name="triggerKind" defaultValue="Referral">
            <option>Referral</option>
            <option>Advocacy</option>
            <option>Gift</option>
            <option>Campaign</option>
          </select>
        </label>
        <label>
          Reward
          <select name="rewardKind" defaultValue="Discount">
            <option>Discount</option>
            <option>GiftEntitlement</option>
            <option>RaffleEligibility</option>
            <option>CharityImpact</option>
          </select>
        </label>
      </div>
      <div className={styles.formRow}>
        <label>
          Status
          <select name="status" defaultValue="Draft">
            <option>Draft</option>
            <option>Active</option>
            <option>Paused</option>
            <option>Retired</option>
          </select>
        </label>
        <label>
          Expected version
          <input name="expectedVersion" type="number" min="0" defaultValue="0" required />
        </label>
      </div>
      <label>
        Max issues / account (اختیاری)
        <input name="maxIssuesPerAccount" type="number" min="1" max="100000" />
      </label>
      <label>
        Reward Config JSON
        <textarea
          name="rewardConfig"
          required
          defaultValue={'{"value":1}'}
          maxLength={4096}
          dir="ltr"
        />
      </label>
      <label>
        دلیل تغییر
        <textarea name="reason" required minLength={10} maxLength={1000} />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "در حال ثبت…" : "ذخیره Rule"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function RewardSourceReviewForm({
  kind,
  sourceId,
  version,
}: {
  kind: "Referral" | "Advocacy";
  sourceId: string;
  version: number;
}) {
  const [state, action, pending] = useActionState(
    reviewRewardSourceAction,
    initialGrowthRewardActionState,
  );
  const keyRef = useIdempotencyInput(`growth-review-${sourceId}`, state);
  return (
    <form action={action} className={styles.reviewForm}>
      <input ref={keyRef} type="hidden" name="idempotencyKey" />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="sourceId" value={sourceId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <label>
        دلیل review
        <input name="reason" required minLength={10} maxLength={1000} />
      </label>
      <div className={styles.reviewActions}>
        <button name="decision" value="approve" type="submit" disabled={pending}>
          Approve
        </button>
        <button name="decision" value="reject" type="submit" disabled={pending} data-tone="danger">
          Reject
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}
