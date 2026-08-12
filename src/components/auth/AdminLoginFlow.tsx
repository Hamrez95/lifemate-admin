"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/src/lib/supabase/client";
import { normalizeAdminPhone } from "@/src/lib/auth/phone";

type Step = "phone" | "otp" | "mfa-challenge" | "mfa-enroll" | "checking";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

function friendlyAuthError(): string {
  return "ورود کامل نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید.";
}

export function AdminLoginFlow() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [step, setStep] = useState<Step>("checking");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const continueToCommandCenter = useCallback(() => {
    router.replace("/");
    router.refresh();
  }, [router]);

  const prepareMfa = useCallback(async () => {
    setMessage(null);
    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) throw aalError;

    if (aal.currentLevel === "aal2") {
      continueToCommandCenter();
      return;
    }

    if (aal.nextLevel === "aal2") {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      const factor = factors.totp[0];
      if (!factor) throw new Error("A verified TOTP factor was expected but not found.");
      setFactorId(factor.id);
      setCode("");
      setStep("mfa-challenge");
      return;
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "LifeMate Command Center",
    });
    if (error) throw error;
    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setFactorId(data.id);
    setCode("");
    setStep("mfa-enroll");
  }, [continueToCommandCenter, supabase]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) {
        setStep("phone");
        return;
      }
      try {
        await prepareMfa();
      } catch {
        if (active) {
          setMessage(friendlyAuthError());
          setStep("phone");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [prepareMfa, supabase]);

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeAdminPhone(phoneInput);
    if (!normalized) {
      setMessage("شماره موبایل را با فرمت معتبر وارد کنید؛ برای ایران می‌توانید با ۰۹ شروع کنید.");
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setPhone(normalized);
      setCode("");
      setStep("otp");
      setMessage("کد یک‌بارمصرف برای حساب موجود ارسال شد.");
    } catch {
      setMessage("امکان ارسال کد ورود نبود. اگر عضو LifeMate هستید کمی بعد دوباره تلاش کنید.");
    } finally {
      setPending(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phone || !/^\d{6,8}$/.test(code)) {
      setMessage("کد یک‌بارمصرف معتبر را وارد کنید.");
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
      if (error) throw error;
      await prepareMfa();
    } catch {
      setMessage(friendlyAuthError());
    } finally {
      setPending(false);
    }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !/^\d{6,8}$/.test(code)) {
      setMessage("کد برنامه احراز هویت را وارد کنید.");
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
      continueToCommandCenter();
    } catch {
      setMessage("تأیید دومرحله‌ای ناموفق بود. کد جدید برنامه Authenticator را وارد کنید.");
    } finally {
      setPending(false);
    }
  }

  if (step === "checking") {
    return (
      <div className="auth-state" role="status" aria-live="polite">
        <span className="auth-state__spinner" aria-hidden="true" />
        <p>در حال بررسی نشست امن...</p>
      </div>
    );
  }

  return (
    <div className="auth-flow">
      {step === "phone" && (
        <form onSubmit={requestOtp} className="auth-form">
          <label htmlFor="admin-phone">شماره موبایل حساب LifeMate</label>
          <input
            id="admin-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phoneInput}
            onChange={(event) => setPhoneInput(event.target.value)}
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            dir="ltr"
            disabled={pending}
          />
          <p className="auth-help">ورود حساب جدید از این صفحه ساخته نمی‌شود؛ فقط حساب موجود LifeMate پذیرفته است.</p>
          <button type="submit" className="primary-button" disabled={pending}>
            {pending ? "در حال ارسال..." : "دریافت کد ورود"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verifyOtp} className="auth-form">
          <label htmlFor="admin-otp">کد پیامک</label>
          <input
            id="admin-otp"
            className="code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
            dir="ltr"
            disabled={pending}
          />
          <button type="submit" className="primary-button" disabled={pending}>
            {pending ? "در حال بررسی..." : "تأیید کد"}
          </button>
          <button type="button" className="text-button" onClick={() => setStep("phone")} disabled={pending}>
            اصلاح شماره موبایل
          </button>
        </form>
      )}

      {step === "mfa-challenge" && (
        <form onSubmit={verifyMfa} className="auth-form">
          <div className="auth-security-mark" aria-hidden="true">2FA</div>
          <h2>تأیید دومرحله‌ای</h2>
          <p className="auth-help">کد فعلی برنامه Authenticator را وارد کنید. Command Center نشست AAL2 را الزامی می‌کند.</p>
          <label htmlFor="admin-mfa-code">کد Authenticator</label>
          <input
            id="admin-mfa-code"
            className="code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
            dir="ltr"
            disabled={pending}
          />
          <button type="submit" className="primary-button" disabled={pending}>
            {pending ? "در حال تأیید..." : "ورود امن"}
          </button>
        </form>
      )}

      {step === "mfa-enroll" && enrollment && (
        <form onSubmit={verifyMfa} className="auth-form">
          <div className="auth-security-mark" aria-hidden="true">MFA</div>
          <h2>فعال‌سازی Authenticator</h2>
          <p className="auth-help">این مرحله برای دسترسی مدیریتی اجباری است. QR را با یک برنامه TOTP اسکن کنید و سپس کد را وارد کنید.</p>
          <div className="mfa-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrollment.qrCode} alt="QR فعال‌سازی TOTP برای LifeMate Command Center" width="196" height="196" />
          </div>
          <details className="mfa-secret">
            <summary>ورود دستی کلید</summary>
            <code dir="ltr">{enrollment.secret}</code>
          </details>
          <label htmlFor="admin-enroll-code">اولین کد Authenticator</label>
          <input
            id="admin-enroll-code"
            className="code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
            dir="ltr"
            disabled={pending}
          />
          <button type="submit" className="primary-button" disabled={pending}>
            {pending ? "در حال فعال‌سازی..." : "فعال‌سازی و ورود"}
          </button>
        </form>
      )}

      {message && <p className="auth-message" role="status" aria-live="polite">{message}</p>}
    </div>
  );
}
