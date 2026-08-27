"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  initialCommerceOperationsActionState,
  openReconciliationAction,
  renewalIntentAction,
  requestRefundAction,
  type CommerceOperationsActionState,
} from "./actions";
import styles from "./operations.module.css";

function key(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function useIdempotencyInput(prefix: string, state: CommerceOperationsActionState) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handledSuccessRef = useRef<CommerceOperationsActionState | null>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    if (!input.value) {
      input.value = key(prefix);
    }

    if (state.status === "success" && handledSuccessRef.current !== state) {
      input.value = key(prefix);
      handledSuccessRef.current = state;
    }
  }, [prefix, state]);

  return inputRef;
}

function ensureIdempotencyKey(ref: React.RefObject<HTMLInputElement | null>, prefix: string) {
  if (ref.current && !ref.current.value) {
    ref.current.value = key(prefix);
  }
}

function Status({ state }: { state: CommerceOperationsActionState }) {
  if (state.status === "idle") return null;
  return (
    <p className={styles.feedback} data-status={state.status} role="status">
      {state.message}
    </p>
  );
}

export function RefundRequestForm() {
  const [state, action, pending] = useActionState(
    requestRefundAction,
    initialCommerceOperationsActionState,
  );
  const idempotencyRef = useIdempotencyInput("refund-request", state);
  return (
    <form
      action={action}
      className={styles.form}
      onSubmit={() => ensureIdempotencyKey(idempotencyRef, "refund-request")}
    >
      <input ref={idempotencyRef} type="hidden" name="idempotencyKey" />
      <label>
        Transaction ID
        <input name="transactionId" required autoComplete="off" />
      </label>
      <label>
        Amount minor-unit
        <input name="amountMinor" inputMode="numeric" required autoComplete="off" />
      </label>
      <label>
        دلیل
        <textarea name="reason" minLength={10} maxLength={1000} required />
      </label>
      <label className={styles.confirm}>
        <input type="checkbox" name="confirmation" value="confirm-refund-request" required />
        درخواست refund را بررسی و تأیید می‌کنم.
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "در حال ثبت…" : "ثبت Refund Request"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function ReconciliationForm() {
  const [state, action, pending] = useActionState(
    openReconciliationAction,
    initialCommerceOperationsActionState,
  );
  const idempotencyRef = useIdempotencyInput("reconciliation", state);
  return (
    <form
      action={action}
      className={styles.form}
      onSubmit={() => ensureIdempotencyKey(idempotencyRef, "reconciliation")}
    >
      <input ref={idempotencyRef} type="hidden" name="idempotencyKey" />
      <label>
        Transaction ID (اختیاری)
        <input name="transactionId" autoComplete="off" />
      </label>
      <label>
        Case Type
        <input
          name="caseType"
          minLength={5}
          maxLength={40}
          required
          defaultValue="provider_mismatch"
        />
      </label>
      <label>
        دلیل
        <textarea name="reason" minLength={10} maxLength={1000} required />
      </label>
      <label className={styles.confirm}>
        <input type="checkbox" name="confirmation" value="confirm-reconciliation-open" required />
        Provider facts را تغییر نمی‌دهم و فقط case می‌سازم.
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "در حال ثبت…" : "باز کردن Reconciliation Case"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function RenewalIntentForm() {
  const [state, action, pending] = useActionState(
    renewalIntentAction,
    initialCommerceOperationsActionState,
  );
  const idempotencyRef = useIdempotencyInput("renewal-intent", state);
  return (
    <form
      action={action}
      className={styles.form}
      onSubmit={() => ensureIdempotencyKey(idempotencyRef, "renewal-intent")}
    >
      <input ref={idempotencyRef} type="hidden" name="idempotencyKey" />
      <label>
        Subscription ID
        <input name="subscriptionId" required autoComplete="off" />
      </label>
      <label>
        Expected Version
        <input name="expectedVersion" inputMode="numeric" min={1} required />
      </label>
      <label>
        Reason Code
        <input name="reasonCode" required defaultValue="user_requested" />
      </label>
      <label>
        توضیح اختیاری
        <textarea name="reasonText" maxLength={1000} />
      </label>
      <label className={styles.confirm}>
        <input type="checkbox" name="cancelAtPeriodEnd" /> لغو تمدید در پایان دوره
      </label>
      <label className={styles.confirm}>
        <input type="checkbox" name="confirmation" value="confirm-renewal-intent" required />
        اثر این تغییر روی renewal را تأیید می‌کنم.
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "در حال ثبت…" : "ثبت Renewal Intent"}
      </button>
      <Status state={state} />
    </form>
  );
}
