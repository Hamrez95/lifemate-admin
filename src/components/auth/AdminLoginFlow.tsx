"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/src/lib/supabase/client";

type Step = "provider" | "mfa-challenge" | "mfa-enroll" | "checking";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

function friendlyAuthError(): string {
  return "ورود کامل نشد. دوباره تلاش کنید یا از مدیر سیستم برای بررسی عضویت کمک بگیرید.";
}

export function AdminLoginFlow() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [step, setStep] = useState<Step>("checking");
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
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
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
        setStep("provider");
        return;
      }
      try {
        await prepareMfa();
      } catch {
        if (active) {
          setMessage(friendlyAuthError());
          setStep("provider");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [prepareMfa, supabase]);

  async function signInWithGoogle() {
    setPending(true);
    setMessage(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch {
      setMessage(
        "ورود با Google در دسترس نیست. اگر این محیط تازه راه‌اندازی شده، تنظیمات Google provider را بررسی کنید.",
      );
      setPending(false);
    }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !/^\d{6,8}$/.test(code)) {
      setMessage("کد برنامه Authenticator را وارد کنید.");
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
      {step === "provider" && (
        <div className="auth-form">
          <button
            type="button"
            className="primary-button"
            onClick={() => void signInWithGoogle()}
            disabled={pending}
          >
            {pending ? "در حال انتقال امن..." : "ورود با Google"}
          </button>
          <p className="auth-help">
            فقط هویت‌های عضو تیم اجازه ادامه دارند. ورود موفق Google به‌تنهایی هیچ نقش یا دسترسی
            مدیریتی ایجاد نمی‌کند.
          </p>
          <p className="auth-help">
            ورود با شماره موبایل پس از فعال‌شدن provider پیامک canonical LifeMate اضافه می‌شود؛ این
            صفحه SMS آزمایشی یا حساب جدید نمی‌سازد.
          </p>
        </div>
      )}

      {step === "mfa-challenge" && (
        <form onSubmit={verifyMfa} className="auth-form">
          <div className="auth-security-mark" aria-hidden="true">
            2FA
          </div>
          <h2>تأیید دومرحله‌ای</h2>
          <p className="auth-help">
            کد فعلی برنامه Authenticator را وارد کنید. Command Center نشست AAL2 را الزامی می‌کند.
          </p>
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
          <div className="auth-security-mark" aria-hidden="true">
            MFA
          </div>
          <h2>فعال‌سازی Authenticator</h2>
          <p className="auth-help">
            این مرحله برای هر عضو Command Center اجباری است. QR را با Google Authenticator، Microsoft
            Authenticator، 1Password یا برنامه TOTP مشابه اسکن کنید و سپس کد را وارد کنید.
          </p>
          <div className="mfa-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrollment.qrCode}
              alt="QR فعال‌سازی TOTP برای LifeMate Command Center"
              width="196"
              height="196"
            />
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

      {message && (
        <p className="auth-message" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
