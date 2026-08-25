"use client";

import { useActionState, useState } from "react";

import type { CommandCenterPreferences } from "@/src/lib/admin-api/settings-preferences";

import styles from "../ops-settings.module.css";
import {
  initialSettingsActionState,
  updateCommandCenterPreferencesAction,
} from "./actions";

export function SettingsPreferencesForm({
  preferences,
  supportedLocales,
  canWrite,
}: {
  preferences: CommandCenterPreferences;
  supportedLocales: string[];
  canWrite: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateCommandCenterPreferencesAction,
    initialSettingsActionState,
  );
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  return (
    <form
      action={action}
      onChange={() => setIdempotencyKey(crypto.randomUUID())}
      aria-labelledby="organization-settings-title"
    >
      <input type="hidden" name="expectedVersion" value={preferences.version} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="confirmation" value="confirm-settings-change" />

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="organization-name">نام نمایشی Command Center</label>
          <input
            id="organization-name"
            name="displayName"
            defaultValue={preferences.displayName}
            required
            minLength={1}
            maxLength={120}
            disabled={!canWrite || pending}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="default-locale">زبان پیش‌فرض</label>
          <select
            id="default-locale"
            name="locale"
            defaultValue={preferences.locale}
            disabled={!canWrite || pending}
          >
            {supportedLocales.map((locale) => (
              <option key={locale} value={locale}>
                {locale === "fa-IR"
                  ? "فارسی (fa-IR)"
                  : locale === "en-US"
                    ? "English (en-US)"
                    : locale}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="default-timezone">منطقه زمانی IANA</label>
          <input
            id="default-timezone"
            name="timeZone"
            dir="ltr"
            defaultValue={preferences.timeZone}
            required
            maxLength={64}
            disabled={!canWrite || pending}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="settings-version">نسخه canonical</label>
          <input
            id="settings-version"
            value={preferences.version.toLocaleString("fa-IR")}
            readOnly
            aria-readonly="true"
          />
        </div>
      </div>

      <div className={styles.confirmation}>
        <strong>تغییرات Audit می‌شوند</strong>
        <p>
          فقط سه فیلد بالا قابل تغییر هستند. secret، API key، token، connection string و credential
          هرگز جزو این فرم یا قرارداد نیستند.
        </p>
        <div className={styles.field} style={{ marginTop: "0.75rem" }}>
          <label htmlFor="settings-reason">دلیل تغییر</label>
          <textarea
            id="settings-reason"
            name="reason"
            required
            minLength={10}
            maxLength={1000}
            rows={3}
            placeholder="مثلاً: هم‌راستاسازی زبان و منطقه زمانی پنل با سیاست عملیاتی فعلی…"
            disabled={!canWrite || pending}
          />
        </div>
      </div>

      <div className={styles.saveState} aria-live="polite">
        <button type="submit" disabled={!canWrite || pending}>
          {pending ? "در حال ثبت امن…" : canWrite ? "ذخیره تنظیمات" : "فقط خواندنی"}
        </button>
        <span data-status={state.status}>
          {state.message ??
            (canWrite
              ? `نسخه ${preferences.version.toLocaleString("fa-IR")} · آماده ثبت امن`
              : "مجوز settings.write در دسترس نیست.")}
        </span>
      </div>
    </form>
  );
}
