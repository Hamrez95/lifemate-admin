"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  initialEntitlementAdjustmentActionState,
  manualEntitlementAdjustmentAction,
} from "./actions";
import styles from "./adjustments.module.css";

function SubmitButtons({ canRequest, canExecute }: { canRequest: boolean; canExecute: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className={styles.actions}>
      {canRequest ? (
        <button type="submit" name="intent" value="preview" disabled={pending}>
          {pending ? "در حال بررسی…" : "پیش‌نمایش"}
        </button>
      ) : null}
      {canRequest ? (
        <button type="submit" name="intent" value="request" disabled={pending}>
          ثبت درخواست Approval
        </button>
      ) : null}
      {canExecute ? (
        <button className={styles.dangerAction} type="submit" name="intent" value="execute" disabled={pending}>
          اجرای Adjustment
        </button>
      ) : null}
    </div>
  );
}

function JsonPreview({ value }: { value: unknown }) {
  if (value == null) return <span>—</span>;
  return <pre className={styles.previewJson}>{JSON.stringify(value, null, 2)}</pre>;
}

export function AdjustmentForm({
  accountId,
  requestKey,
  referenceAtUtc,
  canRequest,
  canExecute,
}: {
  accountId: string;
  requestKey: string;
  referenceAtUtc: string;
  canRequest: boolean;
  canExecute: boolean;
}) {
  const [state, formAction] = useActionState(
    manualEntitlementAdjustmentAction,
    initialEntitlementAdjustmentActionState,
  );
  const before = state.data?.before;
  const after = state.data?.after;
  const delta = state.data?.delta;

  return (
    <section className={styles.panel} aria-labelledby="adjustment-form-title">
      <header>
        <span>Manual Entitlement</span>
        <h2 id="adjustment-form-title">Grant / Extend / Reduce / Revoke</h2>
        <p>
          این فرم فقط API canonical را صدا می‌زند. Founder هم permission، AAL2، Abuse Rule و Audit را دور
          نمی‌زند؛ فقط در policy مجاز می‌تواند بدون approval تجاری اجرا کند.
        </p>
      </header>

      <form action={formAction} className={styles.form}>
        <input type="hidden" name="idempotencyKey" value={requestKey} />
        <input type="hidden" name="referenceAtUtc" value={referenceAtUtc} />

        <label>
          <span>Account ID</span>
          <input name="subjectAccountId" defaultValue={accountId} required dir="ltr" autoComplete="off" />
        </label>

        <div className={styles.grid2}>
          <label>
            <span>نوع هدف</span>
            <select name="targetType" defaultValue="Product">
              <option value="Product">Product</option>
              <option value="Offer">Offer</option>
            </select>
          </label>
          <label>
            <span>Target ID</span>
            <input name="targetId" required dir="ltr" autoComplete="off" placeholder="UUID محصول یا Offer" />
          </label>
        </div>

        <div className={styles.grid2}>
          <label>
            <span>عملیات</span>
            <select name="operation" defaultValue="Grant">
              <option value="Grant">Grant</option>
              <option value="Extend">Extend</option>
              <option value="Reduce">Reduce</option>
              <option value="Revoke">Revoke</option>
            </select>
          </label>
          <label>
            <span>مدل زمان‌بندی</span>
            <select name="scheduleMode" defaultValue="AddMonths">
              <option value="AddDays">Add Days</option>
              <option value="AddMonths">Add Months</option>
              <option value="ExactExpiry">Exact Expiry</option>
              <option value="Immediate">Immediate · Revoke only</option>
            </select>
          </label>
        </div>

        <div className={styles.grid2}>
          <label>
            <span>Schedule Amount</span>
            <input name="scheduleAmount" type="number" inputMode="numeric" min="1" max="3650" placeholder="مثلاً 30" />
          </label>
          <label>
            <span>Exact Expiry · Tehran</span>
            <input name="exactExpiresAt" type="datetime-local" />
          </label>
        </div>

        <div className={styles.grid2}>
          <label>
            <span>Entitlement ID · برای تغییر موجود</span>
            <input name="entitlementId" dir="ltr" autoComplete="off" placeholder="برای Grant خالی" />
          </label>
          <label>
            <span>Entitlement Version</span>
            <input name="expectedEntitlementVersion" type="number" min="1" inputMode="numeric" />
          </label>
        </div>

        <div className={styles.grid2}>
          <label>
            <span>Approval Request ID · در صورت نیاز</span>
            <input name="approvalRequestId" dir="ltr" autoComplete="off" />
          </label>
          <label>
            <span>Approval Version</span>
            <input name="approvalExpectedVersion" type="number" min="1" inputMode="numeric" />
          </label>
        </div>

        <label>
          <span>دلیل عملیاتی</span>
          <textarea
            name="reason"
            required
            minLength={10}
            maxLength={1000}
            rows={4}
            placeholder="دلیل دقیق adjustment؛ در Audit ثبت می‌شود."
          />
        </label>

        <label className={styles.confirmRow}>
          <input type="checkbox" name="confirmed" />
          <span>برای Reduce / Revoke اثر فوری این تغییر را صریحاً تأیید می‌کنم.</span>
        </label>

        <SubmitButtons canRequest={canRequest} canExecute={canExecute} />
      </form>

      {state.status !== "idle" ? (
        <div className={styles.result} data-status={state.status} role="status" aria-live="polite">
          <strong>{state.message}</strong>
          {state.data ? (
            <div className={styles.previewGrid}>
              <div>
                <span>Before</span>
                <JsonPreview value={before} />
              </div>
              <div>
                <span>Delta</span>
                <JsonPreview value={delta} />
              </div>
              <div>
                <span>After</span>
                <JsonPreview value={after} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
