"use client";

import { useActionState, useState } from "react";

import type { CommerceDiscountCode } from "@/src/lib/admin-api/commerce-discount-codes";

import {
  initialDiscountCodeActionState,
  issueDiscountCodesAction,
  setDiscountCodeStatusAction,
} from "./discount-code-actions";
import styles from "../promotions.module.css";

export function DiscountCodeControls({
  promotionId,
  items,
  canWrite,
}: {
  promotionId: string;
  items: CommerceDiscountCode[];
  canWrite: boolean;
}) {
  const [issueState, issueAction, issuePending] = useActionState(
    issueDiscountCodesAction,
    initialDiscountCodeActionState,
  );
  const [issueKey, setIssueKey] = useState(() => crypto.randomUUID());
  const [mode, setMode] = useState<"explicit" | "generated">("generated");

  return (
    <section className={styles.detailPanel} aria-labelledby="discount-code-control-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Discount-code issuance</span>
          <h3 id="discount-code-control-title">صدور و lifecycle کدهای مستقل</h3>
          <p>
            هر درخواست حداکثر ۵۰ کد می‌سازد. صدور، فعال‌سازی و غیرفعال‌سازی از contract canonical
            انجام می‌شود و هیچ مصرف یا درآمدی در UI جعل نمی‌شود.
          </p>
        </div>
        <span className={styles.permissionBadge}>commerce.discount_code.write</span>
      </div>

      {!canWrite ? (
        <p className={styles.safetyNote}>مجوز صدور یا تغییر وضعیت کد تخفیف را ندارید.</p>
      ) : (
        <form
          action={issueAction}
          className={styles.promotionForm}
          onChange={() => setIssueKey(crypto.randomUUID())}
        >
          <input type="hidden" name="promotionId" value={promotionId} />
          <input type="hidden" name="idempotencyKey" value={issueKey} />
          <label>
            <span>روش صدور</span>
            <select
              name="mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as "explicit" | "generated")}
              disabled={issuePending}
            >
              <option value="generated">تولید خودکار</option>
              <option value="explicit">کدهای مشخص</option>
            </select>
          </label>
          {mode === "generated" ? (
            <>
              <label>
                <span>تعداد · ۱ تا ۵۰</span>
                <input
                  name="generateCount"
                  type="number"
                  min="1"
                  max="50"
                  defaultValue="1"
                  required
                  disabled={issuePending}
                />
              </label>
              <label>
                <span>Prefix · اختیاری</span>
                <input
                  name="prefix"
                  dir="ltr"
                  maxLength={20}
                  pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,19}"
                  disabled={issuePending}
                />
              </label>
            </>
          ) : (
            <label>
              <span>کدها · با فاصله، comma یا خط جدید</span>
              <textarea
                name="codes"
                dir="ltr"
                rows={4}
                required
                placeholder="WELCOME10, FAMILY20"
                disabled={issuePending}
              />
            </label>
          )}
          <label>
            <span>سقف استفاده برای هر کد · اختیاری</span>
            <input
              name="maxRedemptions"
              type="number"
              min="1"
              max="10000000"
              disabled={issuePending}
            />
          </label>
          <label>
            <span>دلیل صدور</span>
            <textarea
              name="reason"
              rows={3}
              minLength={10}
              maxLength={1000}
              required
              disabled={issuePending}
            />
          </label>
          <label className={styles.safetyNote}>
            <input
              name="confirmation"
              type="checkbox"
              value="confirm-discount-code-issue"
              required
              disabled={issuePending}
            />{" "}
            تعداد، سقف استفاده و Rule این Promotion را بررسی کرده‌ام؛ این عملیات فقط کد صادر می‌کند
            و Subscription یا Entitlement موجود را تغییر نمی‌دهد.
          </label>
          <div className={styles.feedback} data-status={issueState.status} aria-live="polite">
            {issueState.message ?? ""}
          </div>
          <button type="submit" className={styles.primaryButton} disabled={issuePending}>
            {issuePending ? "در حال صدور…" : "صدور Audit‌شده کد"}
          </button>
        </form>
      )}

      <div className={styles.codeCards} aria-label="کدهای تخفیف canonical">
        {items.map((item) => (
          <DiscountCodeRow
            key={item.codeId}
            promotionId={promotionId}
            item={item}
            canWrite={canWrite}
          />
        ))}
      </div>
    </section>
  );
}

function DiscountCodeRow({
  promotionId,
  item,
  canWrite,
}: {
  promotionId: string;
  item: CommerceDiscountCode;
  canWrite: boolean;
}) {
  const [state, action, pending] = useActionState(
    setDiscountCodeStatusAction,
    initialDiscountCodeActionState,
  );
  const [key, setKey] = useState(() => crypto.randomUUID());

  return (
    <article>
      <div>
        <code dir="ltr">{item.code}</code>
        <span className={styles.statusBadge} data-status={item.status}>
          {item.status === "Active" ? "فعال" : "غیرفعال"}
        </span>
      </div>
      <p>
        سقف استفاده: {item.maxRedemptions?.toLocaleString("fa-IR") ?? "نامحدود"} · نسخه{" "}
        {item.version.toLocaleString("fa-IR")}
      </p>
      {canWrite ? (
        <form
          action={action}
          className={styles.lifecycleForm}
          onChange={() => setKey(crypto.randomUUID())}
        >
          <input type="hidden" name="promotionId" value={promotionId} />
          <input type="hidden" name="codeId" value={item.codeId} />
          <input type="hidden" name="expectedVersion" value={String(item.version)} />
          <input type="hidden" name="idempotencyKey" value={key} />
          <label>
            <span>وضعیت</span>
            <select name="status" defaultValue={item.status} disabled={pending}>
              <option value="Active">Active</option>
              <option value="Disabled">Disabled</option>
            </select>
          </label>
          <label>
            <span>دلیل تغییر</span>
            <input name="reason" minLength={10} maxLength={1000} required disabled={pending} />
          </label>
          <label className={styles.safetyNote}>
            <input
              name="confirmation"
              type="checkbox"
              value="confirm-discount-code-status"
              required
              disabled={pending}
            />{" "}
            تغییر وضعیت این کد را تأیید می‌کنم.
          </label>
          <div className={styles.feedback} data-status={state.status} aria-live="polite">
            {state.message ?? ""}
          </div>
          <button type="submit" className={styles.lifecycleButton} disabled={pending}>
            {pending ? "در حال ثبت…" : "ثبت وضعیت"}
          </button>
        </form>
      ) : null}
    </article>
  );
}
