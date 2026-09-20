"use client";

import { useState } from "react";

import { setChannelStatusAction } from "./actions";
import styles from "./channels.module.css";

export function ChannelStatusControl({
  providerCode,
  nextEnabled,
}: {
  providerCode: string;
  nextEnabled: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const isDestructive = !nextEnabled;

  return (
    <form action={setChannelStatusAction} className={styles.controlForm}>
      <input type="hidden" name="providerCode" value={providerCode} />
      <input type="hidden" name="enabled" value={String(nextEnabled)} />
      <input
        type="hidden"
        name="idempotencyKey"
        value={`channel-status-${providerCode}-${crypto.randomUUID()}`}
      />
      <label>
        <span>دلیل تغییر</span>
        <input
          name="reason"
          minLength={10}
          maxLength={1000}
          placeholder={
            nextEnabled ? "دلیل فعال‌سازی مجدد کانال" : "دلیل توقف انتشار از این کانال"
          }
          required
        />
      </label>
      {isDestructive ? (
        <label className={styles.destructiveConfirm}>
          <input
            type="checkbox"
            name="operatorConfirmed"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            تأیید می‌کنم غیرفعال‌سازی این کانال ممکن است صف انتشارهای بعدی را متوقف کند؛ وضعیت واقعی
            اجرا فقط پس از پاسخ سرور مشخص می‌شود.
          </span>
        </label>
      ) : null}
      <button
        type="submit"
        data-action={nextEnabled ? "enable" : "disable"}
        disabled={isDestructive && !confirmed}
        title={
          isDestructive && !confirmed
            ? "برای غیرفعال‌سازی، تأیید آگاهانه لازم است."
            : undefined
        }
      >
        {nextEnabled ? "فعال‌سازی عملیاتی" : "غیرفعال‌سازی فوری"}
      </button>
    </form>
  );
}
