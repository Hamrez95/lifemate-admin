"use client";

import { useActionState, useState } from "react";
import {
  initialAccessGrantActionState,
  mutateAccessGrantAction,
} from "./actions";
import styles from "./access-grant-actions.module.css";

export function AccessGrantActions({
  grantId,
  version,
  scopes,
  expiresAtUtc,
}: {
  grantId: string;
  version: number;
  scopes: string[];
  expiresAtUtc: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    mutateAccessGrantAction,
    initialAccessGrantActionState,
  );
  const [selectedAction, setSelectedAction] = useState<"extend" | "replace-scopes" | "revoke">("extend");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const defaultExpiry = expiresAtUtc ? new Date(expiresAtUtc).toISOString().slice(0, 16) : "";

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="grantId" value={grantId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <label>
        <span>عملیات</span>
        <select
          name="action"
          value={selectedAction}
          onChange={(event) =>
            setSelectedAction(event.target.value as "extend" | "replace-scopes" | "revoke")
          }
        >
          <option value="extend">تمدید دسترسی</option>
          <option value="replace-scopes">کاهش دامنه دسترسی</option>
          <option value="revoke">لغو دسترسی</option>
        </select>
      </label>

      {selectedAction === "extend" ? (
        <label>
          <span>پایان جدید (UTC)</span>
          <input type="datetime-local" name="expiresAtUtc" defaultValue={defaultExpiry} required />
        </label>
      ) : null}

      {selectedAction === "replace-scopes" ? (
        <fieldset className={styles.scopes}>
          <legend>scopeهایی که باید باقی بمانند</legend>
          {scopes.map((scope) => (
            <label key={scope}>
              <input type="checkbox" name="scopes" value={scope} defaultChecked />
              <code>{scope}</code>
            </label>
          ))}
          <small>افزودن scope جدید از این پنل ممکن نیست؛ فقط کاهش دامنه مجاز است.</small>
        </fieldset>
      ) : null}

      <label>
        <span>دلیل تغییر</span>
        <textarea
          name="reason"
          minLength={10}
          maxLength={1000}
          required
          placeholder="دلیل عملیاتی مشخص و قابل Audit را وارد کنید"
        />
      </label>

      <label className={styles.confirmation}>
        <input
          type="checkbox"
          name="confirmation"
          value="confirm-access-grant-change"
          required
        />
        <span>تأیید می‌کنم این تغییر محدود، هدفمند و قابل Audit است.</span>
      </label>

      <button type="submit" disabled={pending} data-danger={selectedAction === "revoke" ? "true" : "false"}>
        {pending ? "در حال ثبت…" : "ثبت عملیات"}
      </button>

      {state.status !== "idle" ? (
        <p className={styles.feedback} data-state={state.status} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
