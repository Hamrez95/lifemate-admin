"use client";

import { useActionState, useEffect, useState } from "react";

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

function useIdempotencyKey(prefix: string, state: CommerceOperationsActionState) {
  const [idempotencyKey, setIdempotencyKey] = useState("");

  useEffect(() => {
    setIdempotencyKey(key(prefix));
  }, [prefix]);

  useEffect(() => {
    if (state.status === "success") {
      setIdempotencyKey(key(prefix));
    }
  }, [prefix, state]);

  return idempotencyKey;
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
  const idempotencyKey = useIdempotencyKey("refund-request", state);
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
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
      <button type="submit" disabled={pending || !idempotencyKey}>
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
  const idempotencyKey = useIdempotencyKey("reconciliation", state);
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
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
      <button type="submit" disabled={pending || !idempotencyKey}>
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
  const idempotencyKey = useIdempotencyKey("renewal-intent", state);
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
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
      <button type="submit" disabled={pending || !idempotencyKey}>
        {pending ? "در حال ثبت…" : "ثبت Renewal Intent"}
      </button>
      <Status state={state} />
    </form>
  );
}
