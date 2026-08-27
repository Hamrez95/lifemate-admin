"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { useAdminSession } from "@/src/components/auth/AdminSessionProvider";

import { initialUserActionFormState, runUserAccountAction } from "./actions";
import styles from "./user-action-menu.module.css";

type UserActionMenuProps = {
  accountId: string;
  accountStatus: string;
  canManage: boolean;
};

type ActionConfig = {
  action: "suspend" | "restore";
  title: string;
  trigger: string;
  confirm: string;
  description: string;
  impact: string;
  tone: "danger" | "restore";
};

function configForStatus(status: string): ActionConfig | null {
  if (status === "Active") {
    return {
      action: "suspend",
      title: "تعلیق حساب کاربر",
      trigger: "تعلیق حساب",
      confirm: "تأیید و تعلیق حساب",
      description:
        "این اقدام وضعیت حساب را از Active به Disabled تغییر می‌دهد. اطلاعات کاربر حذف نمی‌شود.",
      impact:
        "تا زمان بازگردانی حساب، سرویس‌های LifeMate باید این وضعیت غیرفعال را در مرزهای دسترسی خود رعایت کنند.",
      tone: "danger",
    };
  }
  if (status === "Disabled") {
    return {
      action: "restore",
      title: "بازگردانی حساب کاربر",
      trigger: "فعال‌سازی دوباره",
      confirm: "تأیید و فعال‌سازی حساب",
      description:
        "این اقدام وضعیت حساب را از Disabled به Active برمی‌گرداند و داده‌ای را بازنویسی یا حذف نمی‌کند.",
      impact:
        "بازگردانی فقط وضعیت حساب را فعال می‌کند؛ مجوزهای مراقبت، Consent و Access Grant مستقل باقی می‌مانند.",
      tone: "restore",
    };
  }
  return null;
}

function CommerceAdjustmentAction({ accountId }: { accountId: string }) {
  const admin = useAdminSession();
  const canAdjust = admin.permissions.some((permission) =>
    [
      "commerce.entitlement.adjust.read",
      "commerce.entitlement.adjust.request",
      "commerce.entitlement.adjust.execute",
    ].includes(permission),
  );

  if (!canAdjust) return null;

  return (
    <aside className={styles.panel} data-tone="restore" aria-label="عملیات اشتراک کاربر">
      <div className={styles.panelCopy}>
        <span className={styles.kicker}>Commerce actions</span>
        <strong>Subscription / Entitlement Adjustment</strong>
        <p>
          Account context همین User 360 به workflow canonical منتقل می‌شود؛ Grant/Extend/Reduce/Revoke
          همچنان approval، abuse policy و audit را در Core enforce می‌کنند.
        </p>
      </div>
      <a
        className={styles.trigger}
        data-tone="restore"
        href={`/commerce/entitlements/adjustments?accountId=${encodeURIComponent(accountId)}`}
      >
        مدیریت Entitlement
      </a>
    </aside>
  );
}

export function UserActionMenu({ accountId, accountStatus, canManage }: UserActionMenuProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [state, formAction, pending] = useActionState(
    runUserAccountAction,
    initialUserActionFormState,
  );
  const config = configForStatus(accountStatus);

  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    router.refresh();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [router, state.status]);

  function openDialog() {
    if (!config || !canManage || pending) return;
    setIdempotencyKey(crypto.randomUUID());
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (pending) return;
    dialogRef.current?.close();
    triggerRef.current?.focus();
  }

  if (!canManage) {
    return (
      <>
        <aside className={styles.panel} data-tone="locked" aria-label="عملیات حساب کاربر">
          <div className={styles.panelCopy}>
            <span className={styles.kicker}>User actions</span>
            <strong>عملیات حساس محدود است</strong>
            <p>برای تعلیق یا بازگردانی حساب، مجوز users.suspend لازم است.</p>
          </div>
          <span className={styles.lockedBadge}>فقط مشاهده</span>
        </aside>
        <CommerceAdjustmentAction accountId={accountId} />
      </>
    );
  }

  if (!config) {
    return (
      <>
        <aside className={styles.panel} data-tone="locked" aria-label="عملیات حساب کاربر">
          <div className={styles.panelCopy}>
            <span className={styles.kicker}>User actions</span>
            <strong>اقدام مستقیم برای این وضعیت تعریف نشده</strong>
            <p>
              حساب‌های در انتظار حذف یا وضعیت‌های خارج از چرخه Active/Disabled از این منو تغییر
              نمی‌کنند.
            </p>
          </div>
          <span className={styles.lockedBadge}>{accountStatus}</span>
        </aside>
        <CommerceAdjustmentAction accountId={accountId} />
      </>
    );
  }

  return (
    <>
      <aside className={styles.panel} data-tone={config.tone} aria-label="عملیات حساب کاربر">
        <div className={styles.panelCopy}>
          <span className={styles.kicker}>User actions</span>
          <strong>{config.title}</strong>
          <p>هر اقدام نیاز به دلیل دارد، idempotent اجرا می‌شود و در Audit Log ثبت خواهد شد.</p>
        </div>
        <button
          ref={triggerRef}
          className={styles.trigger}
          data-tone={config.tone}
          type="button"
          onClick={openDialog}
          disabled={pending}
        >
          {config.trigger}
        </button>
      </aside>

      <CommerceAdjustmentAction accountId={accountId} />

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="user-action-dialog-title"
        aria-describedby="user-action-dialog-description"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <div className={styles.dialogGlow} aria-hidden="true" />
        <form action={formAction} className={styles.form}>
          <input type="hidden" name="accountId" value={accountId} />
          <input type="hidden" name="action" value={config.action} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

          <header className={styles.dialogHeader}>
            <span className={styles.dialogIcon} data-tone={config.tone} aria-hidden="true">
              {config.action === "suspend" ? "!" : "↻"}
            </span>
            <div>
              <span className={styles.kicker}>اقدام حساس و audit-ready</span>
              <h3 id="user-action-dialog-title">{config.title}</h3>
              <p id="user-action-dialog-description">{config.description}</p>
            </div>
          </header>

          <div className={styles.impact} data-tone={config.tone}>
            <strong>اثر این اقدام</strong>
            <p>{config.impact}</p>
          </div>

          <label className={styles.reasonField}>
            <span>دلیل این اقدام</span>
            <textarea
              name="reason"
              minLength={10}
              maxLength={1000}
              required
              rows={4}
              autoFocus
              placeholder="مثلاً: درخواست رسمی تیم پشتیبانی پس از بررسی مورد تکرارشونده..."
              disabled={pending}
              onChange={() => {
                if (!pending) setIdempotencyKey(crypto.randomUUID());
              }}
            />
            <small>
              حداقل ۱۰ کاراکتر. از ثبت اطلاعات سلامت یا جزئیات حساس غیرضروری خودداری کنید.
            </small>
          </label>

          <div className={styles.feedback} aria-live="polite" data-status={state.status}>
            {state.status !== "idle" && state.message ? state.message : null}
          </div>

          <footer className={styles.dialogActions}>
            <button
              className={styles.cancel}
              type="button"
              onClick={closeDialog}
              disabled={pending}
            >
              انصراف
            </button>
            <button
              className={styles.confirm}
              data-tone={config.tone}
              type="submit"
              disabled={pending || idempotencyKey.length < 8}
            >
              {pending ? "در حال ثبت امن عملیات…" : config.confirm}
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
