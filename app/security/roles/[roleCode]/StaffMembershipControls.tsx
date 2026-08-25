"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type MouseEvent } from "react";

import { initialStaffActionFormState, runStaffAction } from "./actions";
import styles from "./staff-membership-controls.module.css";

type Props = {
  accountId: string;
  memberStatus: "Active" | "Disabled" | "Revoked";
  roleCode: string;
  hasCurrentRole: boolean;
  canManage: boolean;
};

type Action = {
  action: "disable" | "reenable" | "assign" | "revoke";
  title: string;
  copy: string;
  roleAction: boolean;
  tone: "danger" | "safe";
};

function actionsFor({
  memberStatus,
  hasCurrentRole,
}: Pick<Props, "memberStatus" | "hasCurrentRole">): Action[] {
  if (memberStatus === "Revoked") return [];
  const membership: Action =
    memberStatus === "Active"
      ? {
          action: "disable",
          title: "غیرفعال‌کردن عضو",
          copy: "دسترسی‌های مدیریتی مؤثر عضو تا فعال‌سازی دوباره متوقف می‌شود.",
          roleAction: false,
          tone: "danger",
        }
      : {
          action: "reenable",
          title: "فعال‌سازی دوباره عضو",
          copy: "عضویت دوباره فعال می‌شود؛ نقش‌های قبلی فقط طبق RBAC مؤثر خواهند شد.",
          roleAction: false,
          tone: "safe",
        };
  const role: Action | null =
    memberStatus !== "Active"
      ? null
      : hasCurrentRole
        ? {
            action: "revoke",
            title: "حذف این نقش",
            copy: "فقط نقش فعلی حذف می‌شود؛ هویت و سایر نقش‌ها تغییر نمی‌کنند.",
            roleAction: true,
            tone: "danger",
          }
        : {
            action: "assign",
            title: "افزودن این نقش",
            copy: "اختیار نهایی، رتبه نقش و RBAC فقط در Admin API بررسی می‌شود.",
            roleAction: true,
            tone: "safe",
          };
  return role ? [role, membership] : [membership];
}

export function StaffMembershipControls(props: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<Action | null>(null);
  const [key, setKey] = useState("");
  const [state, formAction, pending] = useActionState(runStaffAction, initialStaffActionFormState);
  const privilegedRole = props.roleCode === "founder" || props.roleCode === "super_admin";
  const actions = privilegedRole ? [] : actionsFor(props);

  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    router.refresh();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [router, state.status]);

  if (!props.canManage) return <span className={styles.locked}>فقط مشاهده</span>;
  if (privilegedRole)
    return (
      <span className={styles.locked} title="Founder و Super Admin از مسیر Staff management تغییر نمی‌کنند.">
        نقش محافظت‌شده
      </span>
    );
  if (actions.length === 0) return <span className={styles.locked}>عضویت لغوشده</span>;

  function open(action: Action, event: MouseEvent<HTMLButtonElement>) {
    triggerRef.current = event.currentTarget;
    setSelected(action);
    setKey(crypto.randomUUID());
    dialogRef.current?.showModal();
  }

  return (
    <>
      <div className={styles.actions} aria-label="کنترل‌های امن عضو">
        {actions.map((action) => (
          <button
            key={action.action}
            className={styles.trigger}
            data-tone={action.tone}
            type="button"
            disabled={pending}
            onClick={(event) => open(action, event)}
          >
            {action.title}
          </button>
        ))}
      </div>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="staff-action-title"
        aria-describedby="staff-action-copy"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        {selected ? (
          <form action={formAction} className={styles.form}>
            <input type="hidden" name="accountId" value={props.accountId} />
            <input type="hidden" name="action" value={selected.action} />
            <input
              type="hidden"
              name="roleCode"
              value={selected.roleAction ? props.roleCode : ""}
            />
            <input type="hidden" name="idempotencyKey" value={key} />
            <header>
              <span>تغییر حساس و ثبت‌شونده</span>
              <h3 id="staff-action-title">{selected.title}</h3>
              <p id="staff-action-copy">{selected.copy}</p>
            </header>
            <p className={styles.notice}>
              دلیل اجباری است. تغییر نقش Founder یا Super Admin و تغییر دسترسی خودتان در API مسدود
              می‌شود. نشست AAL2، permission و audit در قرارداد server-side enforce می‌شوند.
            </p>
            <label>
              دلیل عملیات
              <textarea
                name="reason"
                minLength={10}
                maxLength={1000}
                required
                rows={4}
                autoFocus
                disabled={pending}
                onChange={() => {
                  if (!pending) setKey(crypto.randomUUID());
                }}
                placeholder="مثلاً: پایان همکاری تأییدشده توسط مسئول مربوطه…"
              />
            </label>
            <p className={styles.help}>
              حداقل ۱۰ کاراکتر؛ اطلاعات سلامت یا داده حساس غیرضروری وارد نکنید.
            </p>
            <p className={styles.feedback} data-status={state.status} aria-live="polite">
              {state.status !== "idle" ? state.message : null}
            </p>
            <footer>
              <button type="button" onClick={() => dialogRef.current?.close()} disabled={pending}>
                انصراف
              </button>
              <button type="submit" data-tone={selected.tone} disabled={pending || key.length < 8}>
                {pending ? "در حال ثبت امن…" : "تأیید تغییر"}
              </button>
            </footer>
          </form>
        ) : null}
      </dialog>
    </>
  );
}