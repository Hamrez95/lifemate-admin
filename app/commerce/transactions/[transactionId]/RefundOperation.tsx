"use client";

import { useActionState, useState } from "react";

import type { CommerceTransactionDetail } from "@/src/lib/admin-api/commerce-transaction-detail";

import { initialRefundActionFormState, requestRefundAction } from "./actions";
import styles from "./transaction-detail.module.css";

type RefundOperationProps = {
  transactionId: string;
  capability: CommerceTransactionDetail["refundCapability"];
  requestSeed: string;
};

const capabilityMessages: Record<CommerceTransactionDetail["refundCapability"]["reason"], string> =
  {
    Available: "این تراکنش موفق است و می‌تواند وارد فرآیند بررسی انسانی بازپرداخت شود.",
    MissingPermission: "برای شروع فرآیند بازپرداخت مجوز پرریسک commerce.refund لازم است.",
    TransactionNotEligible:
      "فقط تراکنش با وضعیت مالی Succeeded می‌تواند وارد فرآیند بررسی بازپرداخت شود.",
    WorkflowAlreadyActive:
      "برای این تراکنش یک فرآیند بازپرداخت فعال وجود دارد و درخواست موازی ساخته نمی‌شود.",
  };

export function RefundOperation({ transactionId, capability, requestSeed }: RefundOperationProps) {
  const [state, action, pending] = useActionState(
    requestRefundAction,
    initialRefundActionFormState,
  );
  const [idempotencyKey, setIdempotencyKey] = useState(requestSeed);

  if (!capability.available) {
    return (
      <section className={styles.refundPanel} data-available="false" aria-labelledby="refund-title">
        <div className={styles.sectionHeading}>
          <div>
            <span>Audited financial action</span>
            <h3 id="refund-title">درخواست بازپرداخت</h3>
            <p>{capabilityMessages[capability.reason]}</p>
          </div>
          <span className={styles.permissionBadge}>{capability.permissionRequired}</span>
        </div>
        <div className={styles.safetyNote}>
          این کنترل هرگز مستقیماً provider را صدا نمی‌زند؛ اجرای واقعی بازپرداخت خارج از این مرحله و
          نیازمند فرآیند تأییدشده است.
        </div>
      </section>
    );
  }

  return (
    <section className={styles.refundPanel} data-available="true" aria-labelledby="refund-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Audited financial action</span>
          <h3 id="refund-title">شروع فرآیند بازپرداخت</h3>
          <p>{capabilityMessages.Available}</p>
        </div>
        <span className={styles.riskBadge}>High risk · commerce.refund</span>
      </div>
      <form action={action} className={styles.refundForm}>
        <input type="hidden" name="transactionId" value={transactionId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <label>
          <span>دلیل عملیاتی</span>
          <textarea
            name="reason"
            required
            minLength={10}
            maxLength={1000}
            rows={4}
            disabled={pending}
            placeholder="مثلاً: پرداخت تکراری پس از بررسی شواهد مالی تأیید شد…"
            onChange={() => setIdempotencyKey(crypto.randomUUID())}
          />
          <small>
            دلیل در Audit ثبت می‌شود. اطلاعات کارت، credential یا provider reference را وارد نکنید.
          </small>
        </label>
        <div className={styles.safetyNote}>
          این دکمه فقط یک درخواست <strong>PendingReview</strong> می‌سازد؛ وضعیت Transaction را تغییر
          نمی‌دهد و هیچ بازپرداختی در درگاه اجرا نمی‌کند.
        </div>
        <div
          className={styles.actionFeedback}
          data-status={state.status}
          aria-live="polite"
          role={state.status === "idle" ? undefined : "status"}
        >
          {state.message ?? ""}
        </div>
        <button type="submit" className={styles.refundButton} disabled={pending}>
          {pending ? "در حال ثبت امن…" : "ارسال برای بررسی بازپرداخت"}
        </button>
      </form>
    </section>
  );
}
