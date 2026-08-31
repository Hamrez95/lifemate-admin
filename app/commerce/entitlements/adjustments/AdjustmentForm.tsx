"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  initialEntitlementAdjustmentActionState,
  manualEntitlementAdjustmentAction,
} from "./actions";
import styles from "./adjustments.module.css";

export type ProductAccessOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type ExistingAccessOption = {
  id: string;
  featureCode: string;
  source: string;
  status: string;
  expiresAtUtc: string | null;
  version: number;
};

function SubmitButtons({ canRequest, canExecute }: { canRequest: boolean; canExecute: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className={styles.actions}>
      {canRequest ? (
        <button type="submit" name="intent" value="preview" disabled={pending}>
          {pending ? "در حال بررسی…" : "پیش‌نمایش اثر"}
        </button>
      ) : null}
      {canRequest ? (
        <button type="submit" name="intent" value="request" disabled={pending}>
          ثبت درخواست Approval
        </button>
      ) : null}
      {canExecute ? (
        <button
          className={styles.dangerAction}
          type="submit"
          name="intent"
          value="execute"
          disabled={pending}
        >
          اجرای تغییر دسترسی
        </button>
      ) : null}
    </div>
  );
}

function JsonPreview({ value }: { value: unknown }) {
  if (value == null) return <span>—</span>;
  return <pre className={styles.previewJson}>{JSON.stringify(value, null, 2)}</pre>;
}

function formatExpiry(value: string | null): string {
  if (!value) return "بدون انقضا";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "زمان نامعتبر";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function AdjustmentForm({
  accountId,
  accountLabel,
  requestKey,
  referenceAtUtc,
  canRequest,
  canExecute,
  products,
  entitlements,
}: {
  accountId: string;
  accountLabel: string;
  requestKey: string;
  referenceAtUtc: string;
  canRequest: boolean;
  canExecute: boolean;
  products: ProductAccessOption[];
  entitlements: ExistingAccessOption[];
}) {
  const [state, formAction] = useActionState(
    manualEntitlementAdjustmentAction,
    initialEntitlementAdjustmentActionState,
  );
  const [operation, setOperation] = useState("Grant");
  const [selectedEntitlementId, setSelectedEntitlementId] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(requestKey);
  const before = state.data?.before;
  const after = state.data?.after;
  const delta = state.data?.delta;

  const adjustableEntitlements = useMemo(
    () => entitlements.filter((item) => item.status === "Active" && item.source !== "FREE"),
    [entitlements],
  );
  const selectedEntitlement = adjustableEntitlements.find(
    (item) => item.id === selectedEntitlementId,
  );
  const requiresExisting = operation !== "Grant";

  function rotateRequestKey() {
    setIdempotencyKey(`entitlement-adjust:${crypto.randomUUID()}`);
  }

  return (
    <section className={styles.panel} aria-labelledby="adjustment-form-title">
      <header>
        <span>Manage product access</span>
        <h2 id="adjustment-form-title">اعطا، تمدید، کاهش یا لغو دسترسی</h2>
        <p>
          این workflow فقط Entitlement تجاری را تغییر می‌دهد؛ خرید، تراکنش پرداخت، Relationship،
          Consent یا Health Access جعلی ایجاد نمی‌شود. تمام mutationها از API canonical و RBAC/AAL2،
          Abuse Rule، optimistic version و Audit عبور می‌کنند.
        </p>
      </header>

      <form action={formAction} className={styles.form} onChange={rotateRequestKey}>
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="referenceAtUtc" value={referenceAtUtc} />
        <input type="hidden" name="subjectAccountId" value={accountId} />
        <input type="hidden" name="targetType" value="Product" />
        <input
          type="hidden"
          name="entitlementId"
          value={requiresExisting ? selectedEntitlementId : ""}
        />
        <input
          type="hidden"
          name="expectedEntitlementVersion"
          value={requiresExisting ? String(selectedEntitlement?.version ?? "") : ""}
        />

        <div className={styles.safetyNote}>
          <strong>کاربر:</strong> {accountLabel}
          <br />
          شناسه داخلی حساب برای جلوگیری از انتخاب اشتباه توسط User 360 قفل شده است.
        </div>

        <label>
          <span>محصول LifeMate</span>
          <select name="targetId" required defaultValue="">
            <option value="" disabled>
              انتخاب محصول…
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id} disabled={product.status === "Retired"}>
                {product.name} · {product.code}
                {product.status === "Retired" ? " · بازنشسته" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.grid2}>
          <label>
            <span>عملیات</span>
            <select
              name="operation"
              value={operation}
              onChange={(event) => {
                setOperation(event.target.value);
                setSelectedEntitlementId("");
              }}
            >
              <option value="Grant">Grant · اعطای دسترسی جدید</option>
              <option value="Extend">Extend · تمدید دسترسی</option>
              <option value="Reduce">Reduce · کاهش مدت</option>
              <option value="Revoke">Revoke · لغو فوری</option>
            </select>
          </label>
          <label>
            <span>مدل زمان‌بندی</span>
            <select name="scheduleMode" defaultValue="AddMonths">
              <option value="AddDays">افزودن روز</option>
              <option value="AddMonths">افزودن ماه</option>
              <option value="ExactExpiry">تاریخ انقضای دقیق</option>
              <option value="Immediate">فوری · فقط Revoke</option>
            </select>
          </label>
        </div>

        {requiresExisting ? (
          <label>
            <span>دسترسی موجود</span>
            <select
              value={selectedEntitlementId}
              onChange={(event) => setSelectedEntitlementId(event.target.value)}
              required
              aria-describedby="existing-access-help"
            >
              <option value="" disabled>
                انتخاب دسترسی موجود…
              </option>
              {adjustableEntitlements.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.featureCode} · {item.source} · انقضا {formatExpiry(item.expiresAtUtc)}
                </option>
              ))}
            </select>
            <small id="existing-access-help">
              Entitlementهای Free baseline قابل کاهش/لغو نیستند و عمداً در این فهرست نمی‌آیند.
            </small>
          </label>
        ) : null}

        <div className={styles.grid2}>
          <label>
            <span>مدت</span>
            <input
              name="scheduleAmount"
              type="number"
              inputMode="numeric"
              min="1"
              max="3650"
              placeholder="مثلاً 30"
            />
          </label>
          <label>
            <span>انقضای دقیق · زمان تهران</span>
            <input name="exactExpiresAt" type="datetime-local" />
          </label>
        </div>

        <div className={styles.grid2}>
          <label>
            <span>دسته دلیل</span>
            <select name="reasonCategory" required defaultValue="">
              <option value="" disabled>
                انتخاب دلیل…
              </option>
              <option value="Prize/raffle">قرعه‌کشی / جایزه</option>
              <option value="Goodwill">Goodwill / جبران حسن‌نیت</option>
              <option value="Support remedy">جبران پشتیبانی</option>
              <option value="Partnership">همکاری / Partnership</option>
              <option value="Internal beta">بتای داخلی</option>
              <option value="Other">سایر</option>
            </select>
          </label>
          <label>
            <span>Approval Version · در صورت نیاز</span>
            <input name="approvalExpectedVersion" type="number" min="1" inputMode="numeric" />
          </label>
        </div>

        <label>
          <span>Approval Request ID · فقط وقتی policy نیاز دارد</span>
          <input name="approvalRequestId" dir="ltr" autoComplete="off" />
        </label>

        <label>
          <span>توضیح دلیل</span>
          <textarea
            name="reason"
            required
            minLength={10}
            maxLength={900}
            rows={4}
            placeholder="مثلاً برنده قرعه‌کشی شهریور؛ دسترسی سه‌ماهه طبق کمپین تاییدشده."
          />
        </label>

        <label className={styles.confirmRow}>
          <input type="checkbox" name="confirmed" />
          <span>
            برای Reduce / Revoke تأیید می‌کنم اثر روی قابلیت‌ها و زمان انقضا را در پیش‌نمایش بررسی
            کرده‌ام و این عملیات خرید یا سابقه پرداخت واقعی کاربر را تغییر نمی‌دهد.
          </span>
        </label>

        <SubmitButtons canRequest={canRequest} canExecute={canExecute} />
      </form>

      {state.status !== "idle" ? (
        <div className={styles.result} data-status={state.status} role="status" aria-live="polite">
          <strong>{state.message}</strong>
          {state.data ? (
            <div className={styles.previewGrid}>
              <div>
                <span>قبل</span>
                <JsonPreview value={before} />
              </div>
              <div>
                <span>تغییر</span>
                <JsonPreview value={delta} />
              </div>
              <div>
                <span>بعد</span>
                <JsonPreview value={after} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
