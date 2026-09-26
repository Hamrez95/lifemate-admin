"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { createBrowserSupabaseClient } from "@/src/lib/supabase/client";

type Factor = {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: string;
};

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function SecurityFactorsPanel() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success" | null>(null);

  const loadFactors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors((data.totp ?? []).filter((factor) => factor.status === "verified"));
    } catch {
      setMessage("عامل‌های امنیتی قابل بارگذاری نیستند. دوباره تلاش کنید.");
      setMessageTone("error");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFactors();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFactors]);

  async function startBackupEnrollment() {
    setPending(true);
    setMessage(null);
    setMessageTone(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: factors.length ? "LifeMate backup authenticator" : "LifeMate authenticator",
      });
      if (error) throw error;
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setCode("");
    } catch {
      setMessage("افزودن عامل جدید انجام نشد. چند لحظه بعد دوباره تلاش کنید.");
      setMessageTone("error");
    } finally {
      setPending(false);
    }
  }

  async function verifyEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment || !/^\d{6,8}$/.test(code)) {
      setMessage("کد ۶ تا ۸ رقمی Authenticator را وارد کنید.");
      setMessageTone("error");
      return;
    }

    setPending(true);
    setMessage(null);
    setMessageTone(null);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code,
      });
      if (error) throw error;
      setEnrollment(null);
      setCode("");
      setMessage("عامل TOTP با موفقیت فعال شد.");
      setMessageTone("success");
      await loadFactors();
    } catch {
      setMessage("تأیید عامل انجام نشد. کد جدید Authenticator را وارد کنید.");
      setMessageTone("error");
    } finally {
      setPending(false);
    }
  }

  async function removeFactor(factorId: string) {
    if (factors.length <= 1) {
      setMessage("برای حفظ ورود امن، آخرین عامل TOTP قابل حذف نیست.");
      setMessageTone("error");
      return;
    }
    if (!window.confirm("این عامل TOTP حذف شود؟ این کار قابل بازگشت نیست.")) return;

    setPending(true);
    setMessage(null);
    setMessageTone(null);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setMessage("عامل TOTP حذف شد.");
      setMessageTone("success");
      await loadFactors();
    } catch {
      setMessage("حذف عامل انجام نشد. دوباره تلاش کنید.");
      setMessageTone("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="section-card profile-security-card" aria-labelledby="mfa-card-title">
      <div className="section-card__header">
        <div>
          <p className="eyebrow">Multi-factor authentication</p>
          <h2 id="mfa-card-title">عامل‌های ورود دومرحله‌ای</h2>
        </div>
        <span className="state-pill state-pill--safe">AAL2 فعال</span>
      </div>
      <p className="profile-security-card__intro">
        ورود به Command Center به یک عامل TOTP تأییدشده نیاز دارد. بهتر است یک عامل پشتیبان را روی
        دستگاه امن دیگری نگه دارید.
      </p>

      {loading ? (
        <p className="profile-security-card__state" role="status" aria-live="polite">
          در حال بارگذاری عامل‌های امن...
        </p>
      ) : (
        <div className="security-factor-list" aria-label="عامل‌های TOTP فعال">
          {factors.map((factor, index) => (
            <div className="security-factor" key={factor.id}>
              <span className="security-factor__icon" aria-hidden="true">
                {index === 0 ? "✓" : "+"}
              </span>
              <span className="security-factor__copy">
                <strong>{factor.friendly_name || `Authenticator ${index + 1}`}</strong>
                <small>{index === 0 ? "عامل اصلی" : "عامل پشتیبان"} · تأییدشده</small>
              </span>
              <button
                type="button"
                className="text-button security-factor__remove"
                onClick={() => removeFactor(factor.id)}
                disabled={pending || factors.length <= 1}
                aria-label={`حذف ${factor.friendly_name || `عامل ${index + 1}`}`}
                title={
                  factors.length <= 1
                    ? "آخرین عامل TOTP قابل حذف نیست"
                    : pending
                      ? "عملیات امنیتی دیگری در حال انجام است"
                      : undefined
                }
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      )}

      {!enrollment ? (
        <button
          type="button"
          className="primary-button profile-security-card__action"
          onClick={startBackupEnrollment}
          disabled={pending || loading}
          title={
            loading
              ? "عامل‌های امنیتی در حال بارگذاری هستند"
              : pending
                ? "عملیات امنیتی دیگری در حال انجام است"
                : undefined
          }
        >
          {pending ? "در حال آماده‌سازی..." : "افزودن عامل پشتیبان"}
        </button>
      ) : (
        <div className="mfa-enrollment-panel">
          <div>
            <h3>فعال‌سازی عامل جدید</h3>
            <p>QR را با Authenticator اسکن کنید، سپس کد تولیدشده را برای تأیید وارد کنید.</p>
          </div>
          <div className="mfa-qr">
            {/* Supabase returns a data URL here; it never contains a user-facing secret in markup. */}
            <Image
              src={enrollment.qrCode}
              alt="QR کد افزودن عامل TOTP"
              width={196}
              height={196}
              unoptimized
            />
          </div>
          <details className="mfa-secret">
            <summary>نمایش کلید متنی برای ورود دستی</summary>
            <code dir="ltr">{enrollment.secret}</code>
          </details>
          <form className="profile-security-card__verify" onSubmit={verifyEnrollment}>
            <label htmlFor="profile-mfa-code">کد یک‌بارمصرف</label>
            <input
              id="profile-mfa-code"
              className="code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,8}"
              maxLength={8}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              dir="ltr"
              required
              disabled={pending}
            />
            <button
              type="submit"
              className="primary-button"
              disabled={pending}
              title={pending ? "تأیید عامل در حال انجام است" : undefined}
            >
              {pending ? "در حال تأیید..." : "تأیید و فعال‌سازی"}
            </button>
          </form>
        </div>
      )}

      {message && messageTone && (
        <p
          className="profile-password-message"
          data-tone={messageTone}
          role={messageTone === "error" ? "alert" : "status"}
          aria-live={messageTone === "error" ? "assertive" : "polite"}
        >
          {message}
        </p>
      )}
    </section>
  );
}
