"use client";

import { useActionState, useMemo, useState } from "react";

import type {
  CommercePromotionDetail,
  CommercePromotionsResponse,
  PromotionDiscountType,
} from "@/src/lib/admin-api/commerce-promotions";

import {
  changePromotionStatusAction,
  initialPromotionDetailActionState,
  updatePromotionAction,
} from "./actions";
import styles from "../promotions.module.css";

type Props = {
  data: CommercePromotionDetail;
  products: CommercePromotionsResponse["products"];
  canWrite: boolean;
};

function tehranInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return `${map.get("year")}-${map.get("month")}-${map.get("day")}T${map.get("hour")}:${map.get("minute")}`;
}

function percentageValue(data: CommercePromotionDetail): string {
  const basisPoints = data.promotion.discount.percentageBasisPoints;
  return basisPoints == null ? "" : String(basisPoints / 100);
}

export function PromotionOperations({ data, products, canWrite }: Props) {
  const promotion = data.promotion;
  const primaryCode = data.codes[0] ?? null;
  const [editState, editAction, editPending] = useActionState(
    updatePromotionAction,
    initialPromotionDetailActionState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    changePromotionStatusAction,
    initialPromotionDetailActionState,
  );
  const [discountType, setDiscountType] = useState<PromotionDiscountType>(
    promotion.discount.type,
  );
  const [editKey, setEditKey] = useState(() => crypto.randomUUID());
  const [statusKey, setStatusKey] = useState(() => crypto.randomUUID());
  const editable =
    canWrite &&
    promotion.effectiveStatus !== "Active" &&
    promotion.effectiveStatus !== "Expired";
  const statusMutable = canWrite && promotion.effectiveStatus !== "Expired";
  const statusOptions = useMemo(
    () =>
      promotion.effectiveStatus === "Active"
        ? (["Paused", "Active"] as const)
        : (["Active", "Paused"] as const),
    [promotion.effectiveStatus],
  );

  return (
    <section className={styles.operationsPanel} aria-labelledby="promotion-operations-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Audited commercial mutations</span>
          <h3 id="promotion-operations-title">عملیات پروموشن</h3>
          <p>
            ویرایش Rule و تغییر lifecycle دو عملیات جدا هستند؛ هر دو دلیل و Idempotency-Key دارند.
          </p>
        </div>
        <span className={styles.permissionBadge}>commerce.promo.write</span>
      </div>

      {!canWrite ? (
        <div className={styles.safetyNote}>این حساب مجوز تغییر پروموشن را ندارد.</div>
      ) : null}
      {promotion.effectiveStatus === "Active" ? (
        <div className={styles.safetyNote} data-tone="attention">
          برای تغییر مبلغ، درصد، زمان یا کد، ابتدا پروموشن را Pause کن. Core نیز این قانون را enforce
          می‌کند.
        </div>
      ) : null}
      {promotion.effectiveStatus === "Expired" ? (
        <div className={styles.safetyNote} data-tone="danger">
          پروموشن منقضی شده و تغییر Rule یا lifecycle روی آن مسدود است.
        </div>
      ) : null}

      <div className={styles.operationsGrid}>
        <form
          action={editAction}
          className={styles.promotionForm}
          aria-labelledby="promotion-edit-title"
          onChange={() => setEditKey(crypto.randomUUID())}
        >
          <input type="hidden" name="promotionId" value={promotion.promotionId} />
          <input type="hidden" name="idempotencyKey" value={editKey} />
          <h4 id="promotion-edit-title">ویرایش Rule و کد اصلی</h4>
          <div className={styles.formGrid}>
            <label>
              <span>نام</span>
              <input
                name="name"
                defaultValue={promotion.name}
                minLength={2}
                maxLength={160}
                required
                disabled={!editable || editPending}
              />
            </label>
            <label>
              <span>محصول</span>
              <select
                name="productId"
                defaultValue={promotion.product?.id ?? ""}
                disabled={!editable || editPending}
              >
                <option value="">همه محصولات / عمومی</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>کد اصلی</span>
              <input
                name="primaryCode"
                defaultValue={primaryCode?.code ?? ""}
                minLength={3}
                maxLength={64}
                dir="ltr"
                required
                disabled={!editable || editPending}
              />
            </label>
            <label>
              <span>وضعیت کد</span>
              <select
                name="codeStatus"
                defaultValue={primaryCode?.status ?? "Active"}
                disabled={!editable || editPending}
              >
                <option value="Active">فعال</option>
                <option value="Disabled">غیرفعال</option>
              </select>
            </label>
            <label>
              <span>نوع تخفیف</span>
              <select
                name="discountType"
                value={discountType}
                disabled={!editable || editPending}
                onChange={(event) =>
                  setDiscountType(event.target.value as PromotionDiscountType)
                }
              >
                <option value="Percentage">درصدی</option>
                <option value="FixedAmount">مبلغ ثابت</option>
              </select>
            </label>
            {discountType === "Percentage" ? (
              <label>
                <span>درصد</span>
                <input
                  name="percentage"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue={percentageValue(data)}
                  required
                  disabled={!editable || editPending}
                />
              </label>
            ) : (
              <>
                <label>
                  <span>مبلغ ثابت · واحد کوچک ارز</span>
                  <input
                    name="fixedAmountMinor"
                    inputMode="numeric"
                    pattern="[0-9]+"
                    defaultValue={promotion.discount.fixedAmountMinor ?? ""}
                    required
                    disabled={!editable || editPending}
                  />
                </label>
                <label>
                  <span>ارز</span>
                  <input
                    name="currency"
                    defaultValue={promotion.discount.currency ?? "IRR"}
                    pattern="[A-Za-z]{3}"
                    maxLength={3}
                    dir="ltr"
                    required
                    disabled={!editable || editPending}
                  />
                </label>
              </>
            )}
            <label>
              <span>شروع · تهران</span>
              <input
                name="startsAt"
                type="datetime-local"
                defaultValue={tehranInputValue(promotion.startsAtUtc)}
                required
                disabled={!editable || editPending}
              />
            </label>
            <label>
              <span>پایان · تهران</span>
              <input
                name="endsAt"
                type="datetime-local"
                defaultValue={tehranInputValue(promotion.endsAtUtc)}
                disabled={!editable || editPending}
              />
            </label>
            <label>
              <span>سقف کل</span>
              <input
                name="maxRedemptions"
                type="number"
                min="1"
                max="10000000"
                defaultValue={promotion.maxRedemptions ?? ""}
                disabled={!editable || editPending}
              />
            </label>
            <label>
              <span>سقف کد</span>
              <input
                name="codeMaxRedemptions"
                type="number"
                min="1"
                max="10000000"
                defaultValue={primaryCode?.maxRedemptions ?? ""}
                disabled={!editable || editPending}
              />
            </label>
          </div>
          <label className={styles.wideField}>
            <span>توضیح</span>
            <textarea
              name="description"
              rows={2}
              maxLength={1000}
              defaultValue={promotion.description ?? ""}
              disabled={!editable || editPending}
            />
          </label>
          <label className={styles.wideField}>
            <span>دلیل ویرایش</span>
            <textarea
              name="reason"
              rows={3}
              minLength={10}
              maxLength={1000}
              required
              disabled={!editable || editPending}
              placeholder="دلیل عملیاتی و قابل ممیزی…"
            />
          </label>
          <div className={styles.feedback} data-status={editState.status} aria-live="polite">
            {editState.message ?? ""}
          </div>
          <button className={styles.primaryButton} type="submit" disabled={!editable || editPending}>
            {editPending ? "در حال ثبت…" : "ثبت تغییر Rule"}
          </button>
        </form>

        <form
          action={statusAction}
          className={styles.lifecycleForm}
          aria-labelledby="promotion-lifecycle-title"
          onChange={() => setStatusKey(crypto.randomUUID())}
        >
          <input type="hidden" name="promotionId" value={promotion.promotionId} />
          <input type="hidden" name="idempotencyKey" value={statusKey} />
          <h4 id="promotion-lifecycle-title">Lifecycle</h4>
          <p>
            Stored: <strong>{promotion.storedStatus}</strong> · Effective:{" "}
            <strong>{promotion.effectiveStatus}</strong>
          </p>
          <label>
            <span>وضعیت هدف</span>
            <select
              name="targetStatus"
              defaultValue={statusOptions[0]}
              disabled={!statusMutable || statusPending}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "Active" ? "فعال" : "متوقف"}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>دلیل تغییر وضعیت</span>
            <textarea
              name="statusReason"
              required
              minLength={10}
              maxLength={1000}
              rows={4}
              disabled={!statusMutable || statusPending}
              placeholder="مثلاً: فعال‌سازی پس از تأیید نهایی شرایط کمپین…"
            />
          </label>
          <div className={styles.safetyNote}>
            حتی درخواست وضعیت یکسان به‌صورت no-op audit می‌شود؛ تغییر Rule از این فرم انجام نمی‌شود.
          </div>
          <div className={styles.feedback} data-status={statusState.status} aria-live="polite">
            {statusState.message ?? ""}
          </div>
          <button
            className={styles.lifecycleButton}
            type="submit"
            disabled={!statusMutable || statusPending}
          >
            {statusPending ? "در حال ثبت…" : "ثبت lifecycle"}
          </button>
        </form>
      </div>
    </section>
  );
}
