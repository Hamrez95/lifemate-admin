"use client";

import { useActionState, useMemo, useState } from "react";

import type { RetentionHold, RetentionPolicy } from "@/src/lib/admin-api/retention-operations";

import {
  activateRetentionPolicyAction,
  createRetentionHoldAction,
  initialRetentionActionState,
  releaseRetentionHoldAction,
} from "./actions";
import styles from "./retention.module.css";

function ActionMessage({ status, message }: { status: string; message?: string }) {
  if (!message) return null;
  return (
    <p className={styles.actionMessage} data-status={status} role="status" aria-live="polite">
      {message}
    </p>
  );
}

function newKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

export function RetentionPolicyForm({ canWrite }: { canWrite: boolean }) {
  const [state, action, pending] = useActionState(
    activateRetentionPolicyAction,
    initialRetentionActionState,
  );
  const [idempotencyKey, setIdempotencyKey] = useState(() => newKey("retention-policy"));

  return (
    <form
      action={async (formData) => {
        await action(formData);
        setIdempotencyKey(newKey("retention-policy"));
      }}
      className={styles.form}
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="confirmation" value="confirm-retention-policy" />
      <label>
        Data category
        <input name="dataCategory" required minLength={3} maxLength={80} placeholder="health_events" />
      </label>
      <label>
        Purpose
        <input name="purposeCode" required minLength={3} maxLength={80} defaultValue="default" />
      </label>
      <label>
        Retention days
        <input name="retentionDays" type="number" min={0} max={36500} placeholder="خالی = بدون زمان ثابت" />
      </label>
      <label>
        Grace days
        <input name="graceDays" type="number" min={0} max={3650} defaultValue={0} required />
      </label>
      <label>
        Disposition
        <select name="disposition" defaultValue="Review">
          <option value="Review">Review</option>
          <option value="Anonymize">Anonymize</option>
          <option value="Archive">Archive</option>
          <option value="Delete">Delete</option>
        </select>
      </label>
      <label className={styles.wide}>
        Legal / operational basis
        <input name="legalBasis" maxLength={500} placeholder="اختیاری؛ policy justification" />
      </label>
      <label className={styles.wide}>
        دلیل تغییر
        <textarea name="reason" required minLength={10} maxLength={1000} rows={3} />
      </label>
      <div className={styles.formFooter}>
        <button type="submit" disabled={!canWrite || pending}>
          {pending ? "در حال ثبت…" : "فعال‌سازی نسخه جدید policy"}
        </button>
        <span>این action داده‌ای را حذف نمی‌کند؛ فقط policy version جدید می‌سازد.</span>
      </div>
      <ActionMessage status={state.status} message={state.message} />
    </form>
  );
}

export function RetentionHoldForm({ canWrite }: { canWrite: boolean }) {
  const [state, action, pending] = useActionState(
    createRetentionHoldAction,
    initialRetentionActionState,
  );
  const [idempotencyKey, setIdempotencyKey] = useState(() => newKey("retention-hold"));
  return (
    <form
      action={async (formData) => {
        await action(formData);
        setIdempotencyKey(newKey("retention-hold"));
      }}
      className={styles.form}
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="confirmation" value="confirm-retention-hold" />
      <label className={styles.wide}>
        Account ID
        <input name="accountId" required placeholder="UUID حساب" />
      </label>
      <label>
        Data category
        <input name="dataCategory" minLength={3} maxLength={80} placeholder="اختیاری" />
      </label>
      <label>
        Purpose
        <input name="purposeCode" minLength={3} maxLength={80} placeholder="اختیاری" />
      </label>
      <label>
        Reason code
        <input name="reasonCode" required minLength={3} maxLength={80} defaultValue="operational_hold" />
      </label>
      <label>
        Expiry UTC
        <input name="expiresAtUtc" type="datetime-local" />
      </label>
      <label className={styles.wide}>
        دلیل
        <textarea name="reason" required minLength={10} maxLength={1000} rows={3} />
      </label>
      <div className={styles.formFooter}>
        <button type="submit" disabled={!canWrite || pending}>
          {pending ? "در حال ثبت…" : "ایجاد hold"}
        </button>
        <span>Hold از purge/anonymization واجد شرایط جلوگیری می‌کند؛ entitlement را تغییر نمی‌دهد.</span>
      </div>
      <ActionMessage status={state.status} message={state.message} />
    </form>
  );
}

export function RetentionHoldCard({ hold, canWrite }: { hold: RetentionHold; canWrite: boolean }) {
  const [state, action, pending] = useActionState(
    releaseRetentionHoldAction,
    initialRetentionActionState,
  );
  const idempotencyKey = useMemo(() => newKey(`retention-release:${hold.id}`), [hold.id]);
  const isActive = hold.status === "Active";
  return (
    <article className={styles.holdCard}>
      <header>
        <div>
          <strong>{hold.reasonCode}</strong>
          <code>{hold.id}</code>
        </div>
        <span data-active={isActive}>{hold.status}</span>
      </header>
      <dl>
        <div>
          <dt>Account</dt>
          <dd>{hold.accountId}</dd>
        </div>
        <div>
          <dt>Scope</dt>
          <dd>{[hold.dataCategory, hold.purposeCode].filter(Boolean).join(" / ") || "همه دسته‌ها"}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd>{hold.expiresAtUtc ?? "بدون تاریخ پایان"}</dd>
        </div>
      </dl>
      {isActive && (
        <form action={action} className={styles.releaseForm}>
          <input type="hidden" name="holdId" value={hold.id} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <input type="hidden" name="confirmation" value="confirm-retention-hold-release" />
          <label>
            دلیل آزادسازی
            <input name="reason" required minLength={10} maxLength={1000} />
          </label>
          <button type="submit" disabled={!canWrite || pending}>
            {pending ? "در حال آزادسازی…" : "Release hold"}
          </button>
        </form>
      )}
      <ActionMessage status={state.status} message={state.message} />
    </article>
  );
}

export function PolicyRow({ policy }: { policy: RetentionPolicy }) {
  return (
    <tr>
      <td>
        <strong>{policy.dataCategory}</strong>
        <small>{policy.purposeCode}</small>
      </td>
      <td>{policy.retentionDays === null ? "بدون سقف ثابت" : `${policy.retentionDays} روز`}</td>
      <td>{policy.graceDays} روز</td>
      <td>{policy.disposition}</td>
      <td>v{policy.policyVersion}</td>
      <td>{policy.status}</td>
    </tr>
  );
}
