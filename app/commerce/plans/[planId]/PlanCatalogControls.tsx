"use client";

import { useActionState, useState } from "react";

import {
  configureTrialAction,
  initialCatalogActionState,
  schedulePriceAction,
  updatePlanAction,
} from "../actions";
import styles from "../catalog.module.css";

type Props = {
  plan: {
    id: string;
    name: string;
    code: string;
    status: string;
  };
  productStatus: string;
  trialPolicy: {
    durationDays: number;
    status: "Active" | "Disabled";
    version: number;
  } | null;
  canPlanWrite: boolean;
  canPriceWrite: boolean;
  canTrialWrite: boolean;
};

export function PlanCatalogControls({
  plan,
  productStatus,
  trialPolicy,
  canPlanWrite,
  canPriceWrite,
  canTrialWrite,
}: Props) {
  const [planState, planAction, planPending] = useActionState(
    updatePlanAction,
    initialCatalogActionState,
  );
  const [priceState, priceAction, pricePending] = useActionState(
    schedulePriceAction,
    initialCatalogActionState,
  );
  const [trialState, trialAction, trialPending] = useActionState(
    configureTrialAction,
    initialCatalogActionState,
  );
  const [planKey, setPlanKey] = useState(() => crypto.randomUUID());
  const [priceKey, setPriceKey] = useState(() => crypto.randomUUID());
  const [trialKey, setTrialKey] = useState(() => crypto.randomUUID());
  const saleBlocked = plan.status !== "Active" || productStatus !== "Active";

  return (
    <section className={styles.controlsGrid} aria-label="کنترل‌های کاتالوگ پلن">
      <article className={styles.controlPanel}>
        <header>
          <span className={styles.permissionBadge}>commerce.plan.write</span>
          <h3>نام و lifecycle پلن</h3>
          <p>Retire فقط فروش جدید را متوقف می‌کند؛ Subscription موجود حذف یا جابه‌جا نمی‌شود.</p>
        </header>
        {!canPlanWrite ? (
          <p className={styles.safetyNote}>مجوز تغییر lifecycle این پلن را ندارید.</p>
        ) : (
          <form
            action={planAction}
            className={styles.form}
            onChange={() => setPlanKey(crypto.randomUUID())}
          >
            <input type="hidden" name="planId" value={plan.id} />
            <input type="hidden" name="idempotencyKey" value={planKey} />
            <label className={styles.field}>
              <span>نام نمایشی</span>
              <input
                name="name"
                defaultValue={plan.name}
                required
                minLength={2}
                maxLength={120}
                disabled={planPending}
              />
            </label>
            <label className={styles.field}>
              <span>وضعیت فروش</span>
              <select name="status" defaultValue={plan.status} disabled={planPending}>
                <option value="Active" disabled={productStatus !== "Active"}>
                  Active · قابل فروش
                </option>
                <option value="Retired">Retired · توقف فروش جدید</option>
              </select>
              {productStatus !== "Active" ? (
                <small>محصول Retired است؛ پلن نمی‌تواند دوباره Active شود.</small>
              ) : null}
            </label>
            <label className={styles.wideField}>
              <span>دلیل تغییر</span>
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={1000}
                rows={3}
                disabled={planPending}
              />
            </label>
            <label className={styles.safetyNote}>
              <input
                name="confirmation"
                type="checkbox"
                value="confirm-plan-change"
                required
                disabled={planPending}
              />{" "}
              تأیید می‌کنم اثر lifecycle روی فروش جدید را بررسی کرده‌ام و Subscription موجود نباید
              تغییر کند.
            </label>
            <div className={styles.feedback} data-status={planState.status} aria-live="polite">
              {planState.message ?? ""}
            </div>
            <button className={styles.secondaryButton} type="submit" disabled={planPending}>
              {planPending ? "در حال ثبت…" : "ثبت تغییر Audit‌شده"}
            </button>
          </form>
        )}
      </article>

      <article className={styles.controlPanel}>
        <header>
          <span className={styles.permissionBadge}>commerce.trial.write</span>
          <h3>Trial policy نسخه‌دار</h3>
          <p>
            Trial فقط برای حسابی مجاز است که قبلاً برای همین Product از Trial استفاده نکرده باشد.
            نسخه فعلی برای جلوگیری از overwrite همزمان به Core ارسال می‌شود.
          </p>
        </header>
        {!canTrialWrite ? (
          <p className={styles.safetyNote}>مجوز تغییر Trial policy این پلن را ندارید.</p>
        ) : saleBlocked ? (
          <p className={styles.safetyNote}>Trial فقط برای Plan و Product فعال قابل پیکربندی است.</p>
        ) : (
          <form
            action={trialAction}
            className={styles.form}
            onChange={() => setTrialKey(crypto.randomUUID())}
          >
            <input type="hidden" name="planId" value={plan.id} />
            <input type="hidden" name="idempotencyKey" value={trialKey} />
            <input type="hidden" name="expectedVersion" value={String(trialPolicy?.version ?? 0)} />
            <label className={styles.field}>
              <span>مدت Trial · روز</span>
              <input
                name="durationDays"
                type="number"
                min="1"
                max="365"
                defaultValue={String(trialPolicy?.durationDays ?? 14)}
                required
                disabled={trialPending}
              />
            </label>
            <label className={styles.field}>
              <span>وضعیت Trial</span>
              <select
                name="status"
                defaultValue={trialPolicy?.status ?? "Disabled"}
                disabled={trialPending}
              >
                <option value="Disabled">Disabled · غیرفعال</option>
                <option value="Active">Active · فعال</option>
              </select>
            </label>
            <div className={styles.wideField}>
              <span>قانون eligibility</span>
              <code>NoPriorTrialForProduct</code>
              <small>
                این policy اجازه تعریف eligibility دلخواه در UI را نمی‌دهد؛ rule از contract
                canonical می‌آید.
              </small>
            </div>
            <label className={styles.wideField}>
              <span>دلیل تغییر</span>
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={1000}
                rows={3}
                disabled={trialPending}
              />
            </label>
            <p className={styles.safetyNote}>
              نسخه فعلی: {(trialPolicy?.version ?? 0).toLocaleString("fa-IR")}. اگر شخص دیگری این
              policy را تغییر داده باشد، Core درخواست را با conflict رد می‌کند و باید صفحه را
              refresh کنید.
            </p>
            <label className={styles.safetyNote}>
              <input
                name="confirmation"
                type="checkbox"
                value="confirm-trial-policy"
                required
                disabled={trialPending}
              />{" "}
              مدت، وضعیت و اثر eligibility را بررسی کرده‌ام و این تغییر هیچ Subscription موجود را
              جابه‌جا یا reprice نمی‌کند.
            </label>
            <div className={styles.feedback} data-status={trialState.status} aria-live="polite">
              {trialState.message ?? ""}
            </div>
            <button className={styles.primaryButton} type="submit" disabled={trialPending}>
              {trialPending ? "در حال ثبت…" : "ثبت Trial policy"}
            </button>
          </form>
        )}
      </article>

      <article className={styles.controlPanel}>
        <header>
          <span className={styles.permissionBadge}>commerce.price.write</span>
          <h3>نسخه جدید قیمت</h3>
          <p>
            مبلغ تاریخی overwrite نمی‌شود؛ نسخه جدید از زمان تعیین‌شده شروع می‌شود و تاریخچه حفظ
            می‌ماند.
          </p>
        </header>
        {!canPriceWrite ? (
          <p className={styles.safetyNote}>مجوز زمان‌بندی قیمت جدید را ندارید.</p>
        ) : saleBlocked ? (
          <p className={styles.safetyNote}>
            برای Plan یا Product بازنشسته قیمت جدید ساخته نمی‌شود. ابتدا lifecycle معتبر لازم است.
          </p>
        ) : (
          <form
            action={priceAction}
            className={styles.form}
            onChange={() => setPriceKey(crypto.randomUUID())}
          >
            <input type="hidden" name="planId" value={plan.id} />
            <input type="hidden" name="idempotencyKey" value={priceKey} />
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>کشور · اختیاری</span>
                <input
                  name="countryCode"
                  dir="ltr"
                  maxLength={2}
                  pattern="[A-Za-z]{2}"
                  placeholder="IR"
                  disabled={pricePending}
                />
                <small>خالی = قیمت عمومی.</small>
              </label>
              <label className={styles.field}>
                <span>ارز</span>
                <input
                  name="currency"
                  defaultValue="IRR"
                  dir="ltr"
                  required
                  maxLength={3}
                  pattern="[A-Za-z]{3}"
                  disabled={pricePending}
                />
              </label>
              <label className={styles.field}>
                <span>کانال فروش</span>
                <input
                  name="storeProvider"
                  defaultValue="manual"
                  dir="ltr"
                  required
                  minLength={2}
                  maxLength={40}
                  pattern="[A-Za-z0-9][A-Za-z0-9._:-]{1,39}"
                  disabled={pricePending}
                />
                <small>
                  مثلاً manual، google_play یا app_store؛ فقط provider canonical استفاده شود.
                </small>
              </label>
              <label className={styles.field}>
                <span>دوره پرداخت · ماه</span>
                <input
                  name="billingPeriodMonths"
                  type="number"
                  min="1"
                  max="120"
                  defaultValue="1"
                  required
                  disabled={pricePending}
                />
              </label>
              <label className={styles.field}>
                <span>مبلغ · واحد کوچک ارز</span>
                <input
                  name="amountMinor"
                  inputMode="numeric"
                  pattern="[0-9]+"
                  required
                  disabled={pricePending}
                />
                <small>برای جلوگیری از خطای اعشار، مبلغ به صورت integer lossless ثبت می‌شود.</small>
              </label>
              <label className={styles.field}>
                <span>شروع قیمت · ساعت تهران</span>
                <input
                  name="effectiveFrom"
                  type="datetime-local"
                  required
                  disabled={pricePending}
                />
              </label>
              <label className={styles.wideField}>
                <span>دلیل قیمت‌گذاری</span>
                <textarea
                  name="reason"
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={3}
                  disabled={pricePending}
                />
              </label>
            </div>
            <p className={styles.safetyNote}>
              تغییر قیمت هیچ Subscription موجود را reprice نمی‌کند. سیاست grandfather / migration
              باید در task مستقل و صریح تعریف شود.
            </p>
            <label className={styles.safetyNote}>
              <input
                name="confirmation"
                type="checkbox"
                value="confirm-price-version"
                required
                disabled={pricePending}
              />{" "}
              مبلغ، ارز، دوره و زمان شروع را بررسی کرده‌ام و تأیید می‌کنم این عملیات فقط یک نسخه
              جدید قیمت می‌سازد.
            </label>
            <div className={styles.feedback} data-status={priceState.status} aria-live="polite">
              {priceState.message ?? ""}
            </div>
            <button className={styles.primaryButton} type="submit" disabled={pricePending}>
              {pricePending ? "در حال زمان‌بندی…" : "ثبت نسخه جدید قیمت"}
            </button>
          </form>
        )}
      </article>
    </section>
  );
}
