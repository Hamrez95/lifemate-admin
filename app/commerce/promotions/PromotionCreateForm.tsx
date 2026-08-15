"use client";

import { useActionState, useState } from "react";

import type { CommercePromotionsResponse } from "@/src/lib/admin-api/commerce-promotions";

import { createPromotionAction, initialPromotionActionState } from "./actions";
import styles from "./promotions.module.css";

type Props = {
  products: CommercePromotionsResponse["products"];
  canWrite: boolean;
};

export function PromotionCreateForm({ products, canWrite }: Props) {
  const [state, action, pending] = useActionState(
    createPromotionAction,
    initialPromotionActionState,
  );
  const [discountType, setDiscountType] = useState<"Percentage" | "FixedAmount">("Percentage");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  if (!canWrite) {
    return (
      <section className={styles.createPanel} aria-labelledby="promotion-create-title">
        <div className={styles.sectionHeading}>
          <div>
            <span>Mutation boundary</span>
            <h3 id="promotion-create-title">ساخت پروموشن</h3>
            <p>برای ایجاد یا تغییر قوانین تخفیف، مجوز commerce.promo.write لازم است.</p>
          </div>
          <span className={styles.permissionBadge}>commerce.promo.write</span>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.createPanel} aria-labelledby="promotion-create-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Audited commercial rule</span>
          <h3 id="promotion-create-title">پروموشن جدید</h3>
          <p>پروموشن جدید همیشه Draft ساخته می‌شود؛ فعال‌سازی یک اقدام جدا و audit‌شده است.</p>
        </div>
        <span className={styles.permissionBadge}>commerce.promo.write</span>
      </div>
      <form
        action={action}
        className={styles.promotionForm}
        onChange={() => setIdempotencyKey(crypto.randomUUID())}
      >
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <div className={styles.formGrid}>
          <label>
            <span>نام پروموشن</span>
            <input name="name" required minLength={2} maxLength={160} disabled={pending} />
          </label>
          <label>
            <span>محصول</span>
            <select name="productId" defaultValue="" disabled={pending}>
              <option value="">همه محصولات / عمومی</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>کد تخفیف</span>
            <input
              name="primaryCode"
              required
              minLength={3}
              maxLength={64}
              dir="ltr"
              autoCapitalize="characters"
              placeholder="WELCOME-20"
              disabled={pending}
            />
          </label>
          <label>
            <span>نوع تخفیف</span>
            <select
              name="discountType"
              value={discountType}
              disabled={pending}
              onChange={(event) => setDiscountType(event.target.value as "Percentage" | "FixedAmount")}
            >
              <option value="Percentage">درصدی</option>
              <option value="FixedAmount">مبلغ ثابت</option>
            </select>
          </label>
          {discountType === "Percentage" ? (
            <label>
              <span>درصد تخفیف</span>
              <input name="percentage" type="number" min="1" max="100" required disabled={pending} />
            </label>
          ) : (
            <>
              <label>
                <span>مبلغ ثابت · واحد کوچک ارز</span>
                <input name="fixedAmountMinor" inputMode="numeric" pattern="[0-9]+" required disabled={pending} />
              </label>
              <label>
                <span>ارز</span>
                <input name="currency" defaultValue="IRR" pattern="[A-Za-z]{3}" maxLength={3} dir="ltr" required disabled={pending} />
              </label>
            </>
          )}
          <label>
            <span>شروع · ساعت تهران</span>
            <input name="startsAt" type="datetime-local" required disabled={pending} />
          </label>
          <label>
            <span>پایان · ساعت تهران</span>
            <input name="endsAt" type="datetime-local" disabled={pending} />
          </label>
          <label>
            <span>سقف استفاده کل</span>
            <input name="maxRedemptions" type="number" min="1" max="10000000" disabled={pending} placeholder="نامحدود" />
          </label>
          <label>
            <span>سقف استفاده این کد</span>
            <input name="codeMaxRedemptions" type="number" min="1" max="10000000" disabled={pending} placeholder="نامحدود" />
          </label>
        </div>
        <label className={styles.wideField}>
          <span>توضیح</span>
          <textarea name="description" maxLength={1000} rows={2} disabled={pending} />
        </label>
        <label className={styles.wideField}>
          <span>دلیل عملیاتی تغییر</span>
          <textarea
            name="reason"
            required
            minLength={10}
            maxLength={1000}
            rows={3}
            disabled={pending}
            placeholder="مثلاً: کمپین شروع پاییز پس از تأیید تیم تجارت…"
          />
          <small>این دلیل در Audit ثبت می‌شود.</small>
        </label>
        <div className={styles.feedback} data-status={state.status} aria-live="polite">
          {state.message ?? ""}
        </div>
        <button className={styles.primaryButton} type="submit" disabled={pending}>
          {pending ? "در حال ثبت امن…" : "ساخت Draft"}
        </button>
      </form>
    </section>
  );
}
