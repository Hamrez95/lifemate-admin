"use client";

import { useActionState, useState } from "react";

import type { CommercePlanFeature } from "@/src/lib/admin-api/commerce-plan-features";

import { configurePlanFeatureAction, initialPlanFeatureActionState } from "./feature-actions";
import styles from "../catalog.module.css";

export function PlanFeatureControls({
  planId,
  items,
  canWrite,
}: {
  planId: string;
  items: CommercePlanFeature[];
  canWrite: boolean;
}) {
  if (items.length === 0) {
    return (
      <article className={styles.controlPanel}>
        <header>
          <span className={styles.permissionBadge}>commerce.plan_feature.write</span>
          <h3>قابلیت‌های پلن</h3>
          <p>برای Product این پلن هنوز feature canonical قابل تخصیصی ثبت نشده است.</p>
        </header>
      </article>
    );
  }

  return (
    <section className={styles.controlsGrid} aria-label="تخصیص قابلیت‌های پلن">
      {items.map((item) => (
        <PlanFeatureRow key={item.featureId} planId={planId} item={item} canWrite={canWrite} />
      ))}
    </section>
  );
}

function PlanFeatureRow({
  planId,
  item,
  canWrite,
}: {
  planId: string;
  item: CommercePlanFeature;
  canWrite: boolean;
}) {
  const [state, action, pending] = useActionState(
    configurePlanFeatureAction,
    initialPlanFeatureActionState,
  );
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  return (
    <article className={styles.controlPanel}>
      <header>
        <span className={styles.permissionBadge}>commerce.plan_feature.write</span>
        <h3>{item.featureCode}</h3>
        <p>{item.description}</p>
      </header>
      <p className={styles.safetyNote}>
        وضعیت canonical: {item.assigned ? "تخصیص‌یافته" : "تخصیص‌نیافته"} · نسخه{" "}
        {item.version.toLocaleString("fa-IR")}. این تنظیم فقط قابلیت sellable پلن را مشخص می‌کند و
        به هیچ کاربر مشخصی Entitlement یا دسترسی سلامت نمی‌دهد.
      </p>
      {!canWrite ? (
        <p className={styles.safetyNote}>مجوز تغییر قابلیت‌های این پلن را ندارید.</p>
      ) : (
        <form
          action={action}
          className={styles.form}
          onChange={() => setIdempotencyKey(crypto.randomUUID())}
        >
          <input type="hidden" name="planId" value={planId} />
          <input type="hidden" name="featureId" value={item.featureId} />
          <input type="hidden" name="expectedVersion" value={String(item.version)} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <label className={styles.field}>
            <span>وضعیت تخصیص</span>
            <select name="assigned" defaultValue={String(item.assigned)} disabled={pending}>
              <option value="true">Assigned · فعال برای این پلن</option>
              <option value="false">Unassigned · غیرفعال برای این پلن</option>
            </select>
          </label>
          <label className={styles.wideField}>
            <span>دلیل تغییر</span>
            <textarea
              name="reason"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              disabled={pending}
            />
          </label>
          <label className={styles.safetyNote}>
            <input
              name="confirmation"
              type="checkbox"
              value="confirm-plan-feature"
              required
              disabled={pending}
            />{" "}
            تأیید می‌کنم این تغییر فقط assignment پلن را تغییر می‌دهد و هیچ Entitlement کاربری را
            مستقیم صادر یا لغو نمی‌کند.
          </label>
          <div className={styles.feedback} data-status={state.status} aria-live="polite">
            {state.message ?? ""}
          </div>
          <button className={styles.secondaryButton} type="submit" disabled={pending}>
            {pending ? "در حال ثبت…" : "ثبت assignment نسخه‌دار"}
          </button>
        </form>
      )}
    </article>
  );
}
