"use client";

import { useActionState, useMemo, useState } from "react";

import type {
  CustomRolePermissionCatalogItem,
  CustomRoleSummary,
} from "@/src/lib/admin-api/custom-roles";

import {
  createCustomRoleAction,
  initialCustomRoleActionState,
  mutateCustomRolePermissionAction,
  retireCustomRoleAction,
  updateCustomRoleAction,
} from "./actions";
import styles from "./custom-roles.module.css";

function RequestKey() {
  return <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />;
}

function Feedback({ state }: { state: typeof initialCustomRoleActionState }) {
  return (
    <div className={styles.feedback} data-status={state.status} aria-live="polite">
      {state.message ?? ""}
    </div>
  );
}

export function CreateCustomRoleForm({ canWrite }: { canWrite: boolean }) {
  const [state, action, pending] = useActionState(createCustomRoleAction, initialCustomRoleActionState);
  const [key, setKey] = useState(() => crypto.randomUUID());
  if (!canWrite) {
    return <p className={styles.notice}>مجوز `security.roles.write` برای ساخت نقش لازم است.</p>;
  }
  return (
    <form className={styles.form} action={action} onChange={() => setKey(crypto.randomUUID())}>
      <input type="hidden" name="idempotencyKey" value={key} />
      <label>
        <span>کد نقش</span>
        <input name="code" dir="ltr" pattern="[a-z][a-z0-9_]{1,63}" required maxLength={64} />
      </label>
      <label>
        <span>نام نمایشی</span>
        <input name="displayName" minLength={2} maxLength={120} required />
      </label>
      <label>
        <span>Rank</span>
        <input name="rank" type="number" min="1" max="1000" required />
      </label>
      <label>
        <span>دلیل</span>
        <textarea name="reason" minLength={10} maxLength={1000} rows={3} required />
      </label>
      <label className={styles.confirmation}>
        <input
          type="checkbox"
          name="confirmation"
          value="confirm-custom-role-create"
          required
          disabled={pending}
        />
        این نقش فقط از permissionهای allow-listed استفاده می‌کند و Founder قابل ایجاد نیست.
      </label>
      <Feedback state={state} />
      <button type="submit" disabled={pending}>{pending ? "در حال ثبت…" : "ساخت نقش"}</button>
    </form>
  );
}

export function CustomRoleCard({
  role,
  catalog,
  canWrite,
}: {
  role: CustomRoleSummary;
  catalog: CustomRolePermissionCatalogItem[];
  canWrite: boolean;
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateCustomRoleAction,
    initialCustomRoleActionState,
  );
  const [retireState, retireAction, retirePending] = useActionState(
    retireCustomRoleAction,
    initialCustomRoleActionState,
  );
  const [permissionState, permissionAction, permissionPending] = useActionState(
    mutateCustomRolePermissionAction,
    initialCustomRoleActionState,
  );
  const [updateKey, setUpdateKey] = useState(() => crypto.randomUUID());
  const [retireKey, setRetireKey] = useState(() => crypto.randomUUID());
  const [permissionKey, setPermissionKey] = useState(() => crypto.randomUUID());
  const delegable = useMemo(() => catalog.filter((item) => item.delegable), [catalog]);

  return (
    <article className={styles.roleCard} data-status={role.status}>
      <header>
        <div>
          <code>{role.code}</code>
          <h3>{role.displayName}</h3>
        </div>
        <div className={styles.meta}>
          <span>{role.status}</span>
          <span>v{role.version}</span>
          <span>{role.activeMemberCount.toLocaleString("fa-IR")} عضو فعال</span>
        </div>
      </header>
      <div className={styles.permissionList} aria-label={`Permissionهای ${role.displayName}`}>
        {role.permissions.length ? role.permissions.map((permission) => <code key={permission}>{permission}</code>) : <span>بدون permission مستقیم</span>}
      </div>

      {canWrite && role.status === "Active" ? (
        <div className={styles.controlGrid}>
          <form className={styles.form} action={updateAction} onChange={() => setUpdateKey(crypto.randomUUID())}>
            <input type="hidden" name="code" value={role.code} />
            <input type="hidden" name="expectedVersion" value={String(role.version)} />
            <input type="hidden" name="idempotencyKey" value={updateKey} />
            <label><span>نام</span><input name="displayName" defaultValue={role.displayName} minLength={2} maxLength={120} required /></label>
            <label><span>Rank</span><input name="rank" type="number" defaultValue={role.rank} min="1" max="1000" required /></label>
            <label><span>دلیل تغییر</span><textarea name="reason" minLength={10} maxLength={1000} rows={2} required /></label>
            <label className={styles.confirmation}><input type="checkbox" name="confirmation" value="confirm-custom-role-update" required disabled={updatePending} />ویرایش نسخه {role.version.toLocaleString("fa-IR")} را تأیید می‌کنم.</label>
            <Feedback state={updateState} />
            <button type="submit" disabled={updatePending}>{updatePending ? "در حال ثبت…" : "ویرایش نقش"}</button>
          </form>

          <form className={styles.form} action={permissionAction} onChange={() => setPermissionKey(crypto.randomUUID())}>
            <input type="hidden" name="roleCode" value={role.code} />
            <input type="hidden" name="expectedVersion" value={String(role.version)} />
            <input type="hidden" name="idempotencyKey" value={permissionKey} />
            <label>
              <span>Permission</span>
              <select name="permissionCode" required defaultValue="">
                <option value="" disabled>انتخاب permission</option>
                {delegable.map((permission) => <option key={permission.code} value={permission.code}>{permission.code} · {permission.domain}</option>)}
              </select>
            </label>
            <label><span>عملیات</span><select name="permissionAction" defaultValue="assign"><option value="assign">افزودن</option><option value="revoke">حذف</option></select></label>
            <label><span>دلیل</span><textarea name="reason" minLength={10} maxLength={1000} rows={2} required /></label>
            <label className={styles.confirmation}><input type="checkbox" name="confirmation" value="confirm-custom-role-permission-assign" onChange={(event) => { const form = event.currentTarget.form; if (!form) return; const actionSelect = form.elements.namedItem("permissionAction") as HTMLSelectElement | null; event.currentTarget.value = actionSelect?.value === "revoke" ? "confirm-custom-role-permission-revoke" : "confirm-custom-role-permission-assign"; }} required disabled={permissionPending} />تغییر permission را با توجه به سطح اختیار فعلی تأیید می‌کنم.</label>
            <Feedback state={permissionState} />
            <button type="submit" disabled={permissionPending}>{permissionPending ? "در حال ثبت…" : "ثبت permission"}</button>
          </form>

          <form className={styles.retireForm} action={retireAction} onChange={() => setRetireKey(crypto.randomUUID())}>
            <input type="hidden" name="code" value={role.code} />
            <input type="hidden" name="expectedVersion" value={String(role.version)} />
            <input type="hidden" name="idempotencyKey" value={retireKey} />
            <label><span>دلیل بازنشستگی</span><textarea name="reason" minLength={10} maxLength={1000} rows={2} required /></label>
            <label className={styles.confirmation}><input type="checkbox" name="confirmation" value="confirm-custom-role-retire" required disabled={retirePending} />بازنشستگی این نقش را تأیید می‌کنم.</label>
            <Feedback state={retireState} />
            <button type="submit" disabled={retirePending}>{retirePending ? "در حال ثبت…" : "بازنشسته‌کردن نقش"}</button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
