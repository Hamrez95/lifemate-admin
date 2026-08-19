"use client";

import { useActionState, useState } from "react";

import { createPlanAction, initialCatalogActionState } from "./actions";
import styles from "./catalog.module.css";

type ProductOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export function PlanCreateForm({
  products,
  canWrite,
}: {
  products: ProductOption[];
  canWrite: boolean;
}) {
  const [state, action, pending] = useActionState(createPlanAction, initialCatalogActionState);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const activeProducts = products.filter((product) => product.status === "Active");

  return (
    <section className={styles.panel} aria-labelledby="plan-create-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>SELLABLE CATALOG</span>
          <h3 id="plan-create-title">ساخت پلن فروش</h3>
          <p>
            کد محصول و کد پلن بعد از ساخت هویت پایدار کاتالوگ هستند؛ تغییر نام و lifecycle از مسیر
            جداگانه و Audit‌شده انجام می‌شود.
          </p>
        </div>
        <span className={styles.permissionBadge}>commerce.plan.write</span>
      </div>

      {!canWrite ? (
        <p className={styles.safetyNote}>
          این بخش فقط خواندنی است. برای ساخت یا تغییر پلن مجوز commerce.plan.write لازم است.
        </p>
      ) : activeProducts.length === 0 ? (
        <p className={styles.safetyNote}>محصول Active برای ساخت پلن وجود ندارد.</p>
      ) : (
        <form
          className={styles.form}
          action={action}
          onChange={() => setIdempotencyKey(crypto.randomUUID())}
        >
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>محصول</span>
              <select name="productId" required disabled={pending} defaultValue="">
                <option value="" disabled>
                  انتخاب محصول
                </option>
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.code}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>کد پایدار پلن</span>
              <input
                name="code"
                dir="ltr"
                required
                minLength={2}
                maxLength={64}
                pattern="[a-z0-9][a-z0-9._-]{1,63}"
                placeholder="premium-yearly"
                disabled={pending}
              />
              <small>
                بعد از ساخت تغییر نمی‌کند؛ برای API، entitlement و گزارش‌ها استفاده می‌شود.
              </small>
            </label>
            <label className={styles.field}>
              <span>نام نمایشی</span>
              <input name="name" required minLength={2} maxLength={120} disabled={pending} />
            </label>
            <label className={styles.wideField}>
              <span>دلیل ایجاد</span>
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={1000}
                rows={3}
                disabled={pending}
                placeholder="مثلاً: پلن سالانه Premium طبق تصمیم تجاری مصوب…"
              />
              <small>Reason همراه با actor و correlation در Audit ثبت می‌شود.</small>
            </label>
          </div>
          <div className={styles.feedback} data-status={state.status} aria-live="polite">
            {state.message ?? ""}
          </div>
          <button className={styles.primaryButton} type="submit" disabled={pending}>
            {pending ? "در حال ثبت امن…" : "ساخت پلن Active"}
          </button>
        </form>
      )}
    </section>
  );
}
