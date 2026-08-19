"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createBrowserSupabaseClient } from "@/src/lib/supabase/client";

type Step = "provider" | "mfa-challenge" | "mfa-enroll" | "checking";
type Mode = "login" | "signup" | "activate";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type WorkforceAuthResponse = {
  ok?: boolean;
  code?: string;
  status?: string;
  access_state?: "founder_compat" | "mfa_required" | "pending_role";
  session?: {
    access_token?: string;
    refresh_token?: string;
  };
};

function friendlyAuthError(code?: string): string {
  switch (code) {
    case "username_unavailable":
      return "این نام کاربری قبلاً استفاده شده است.";
    case "try_again_later":
      return "تعداد تلاش‌ها زیاد شده است. چند دقیقه دیگر دوباره امتحان کنید.";
    case "pending_role":
      return "حساب شما ثبت شده اما هنوز نقش و دسترسی آن توسط مدیر سیستم فعال نشده است.";
    case "invalid_registration":
      return "نام کاربری، نام نمایشی یا رمز عبور معتبر نیست. رمز عبور کارکنان باید حداقل ۸ کاراکتر باشد.";
    case "invalid_activation":
      return "کد فعال‌سازی یا اطلاعات حساب معتبر نیست.";
    case "activation_already_used":
      return "کد فعال‌سازی قبلاً استفاده شده است. حالا از بخش ورود عادی استفاده کنید.";
    case "activation_unavailable":
      return "فعال‌سازی حساب در حال حاضر کامل نشد. دوباره تلاش کنید.";
    case "registration_unavailable":
      return "ثبت‌نام در حال حاضر کامل نشد. دوباره تلاش کنید یا با مدیر سیستم تماس بگیرید.";
    default:
      return "نام کاربری یا رمز عبور صحیح نیست، یا حساب هنوز برای Command Center فعال نشده است.";
  }
}

export function AdminLoginFlow() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const config = useMemo(() => getPublicRuntimeConfig(), []);
  const [step, setStep] = useState<Step>("checking");
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activationCode, setActivationCode] = useState("");
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
          setMessage("برای ادامه، دوباره با نام کاربری وارد شوید.");
          setStep("provider");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [prepareMfa, supabase]);

  async function callWorkforceAuth(
    payload: Record<string, string>,
  ): Promise<WorkforceAuthResponse> {
    const response = await fetch(`${config.supabaseUrl}/functions/v1/lifemate-admin-auth`, {
      method: "POST",
      headers: {
        apikey: config.supabasePublishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await response.json()) as WorkforceAuthResponse;
    if (!response.ok || !data.ok) {
      throw new Error(data.code ?? "authentication_failed");
    }
    return data;
  }

  async function applySession(data: WorkforceAuthResponse) {
    const accessToken = data.session?.access_token;
    const refreshToken = data.session?.refresh_token;
    if (!accessToken || !refreshToken) throw new Error("invalid_session");

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;

    if (data.access_state === "pending_role") {
      await supabase.auth.signOut({ scope: "local" });
      throw new Error("pending_role");
    }
    if (data.access_state === "founder_compat") {
      continueToCommandCenter();
      return;
    }
    await prepareMfa();
  }

  async function signInWithUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const data = await callWorkforceAuth({ action: "login", username, password });
      await applySession(data);
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : undefined;
      setMessage(friendlyAuthError(errorCode));
    } finally {
      setPending(false);
    }
  }

  async function activateFounder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const data = await callWorkforceAuth({
        action: "activate_founder",
        username,
        password,
        activationCode,
      });
      setActivationCode("");
      await applySession(data);
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : undefined;
      setMessage(friendlyAuthError(errorCode));
    } finally {
      setPending(false);
    }
  }

  async function signUpWithUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (password !== confirmPassword) {
      setMessage("تکرار رمز عبور با رمز عبور یکسان نیست.");
      return;
    }
    setPending(true);
    try {
      await callWorkforceAuth({
        action: "signup",
        username,
        displayName: displayName || username,
        password,
      });
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setMessage(
        "ثبت‌نام انجام شد. پس از اینکه مدیر سیستم Role شما را فعال کرد می‌توانید وارد شوید.",
      );
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : undefined;
      setMessage(friendlyAuthError(errorCode));
    } finally {
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
        <>
          <div className="auth-tabs auth-tabs--three" role="tablist" aria-label="روش ورود Command Center">
            <button
              type="button"
              className="auth-tab"
              data-active={mode === "login"}
              onClick={() => {
                setMode("login");
                setMessage(null);
              }}
            >
              ورود
            </button>
            <button
              type="button"
              className="auth-tab"
              data-active={mode === "signup"}
              onClick={() => {
                setMode("signup");
                setMessage(null);
              }}
            >
              ثبت‌نام
            </button>
            <button
              type="button"
              className="auth-tab"
              data-active={mode === "activate"}
              onClick={() => {
                setMode("activate");
                setMessage(null);
              }}
            >
              فعال‌سازی مدیر
            </button>
          </div>

          {mode === "login" ? (
            <form className="auth-form" onSubmit={signInWithUsername}>
              <label htmlFor="admin-username">نام کاربری</label>
              <input
                id="admin-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                dir="ltr"
                required
                disabled={pending}
              />
              <label htmlFor="admin-password">رمز عبور</label>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                dir="ltr"
                required
                disabled={pending}
              />
              <button type="submit" className="primary-button" disabled={pending}>
                {pending ? "در حال ورود..." : "ورود با نام کاربری"}
              </button>
              <p className="auth-help">
                ورود هویت را تأیید می‌کند؛ Role و Permission کارکنان فقط توسط مدیر سیستم فعال
                می‌شود.
              </p>
            </form>
          ) : mode === "signup" ? (
            <form className="auth-form" onSubmit={signUpWithUsername}>
              <label htmlFor="admin-display-name">نام نمایشی</label>
              <input
                id="admin-display-name"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                disabled={pending}
              />
              <label htmlFor="admin-signup-username">نام کاربری</label>
              <input
                id="admin-signup-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                dir="ltr"
                required
                disabled={pending}
              />
              <label htmlFor="admin-signup-password">رمز عبور</label>
              <input
                id="admin-signup-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                dir="ltr"
                required
                disabled={pending}
              />
              <label htmlFor="admin-signup-password-confirm">تکرار رمز عبور</label>
              <input
                id="admin-signup-password-confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                dir="ltr"
                required
                disabled={pending}
              />
              <button type="submit" className="primary-button" disabled={pending}>
                {pending ? "در حال ثبت‌نام..." : "ثبت‌نام با نام کاربری و رمز عبور"}
              </button>
              <p className="auth-help">
                حساب جدید بدون Role ساخته می‌شود و تا زمان تأیید مدیر سیستم هیچ دسترسی مدیریتی
                ندارد.
              </p>
            </form>
          ) : (
            <form className="auth-form" onSubmit={activateFounder}>
              <p className="auth-help">
                این بخش فقط برای اولین فعال‌سازی حساب Founder است و کد آن پس از یک بار استفاده باطل
                می‌شود.
              </p>
              <label htmlFor="admin-activate-username">نام کاربری مدیر</label>
              <input
                id="admin-activate-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                dir="ltr"
                required
                disabled={pending}
              />
              <label htmlFor="admin-activate-password">رمز عبور اولیه</label>
              <input
                id="admin-activate-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                dir="ltr"
                required
                disabled={pending}
              />
              <label htmlFor="admin-activation-code">کد فعال‌سازی یک‌بارمصرف</label>
              <input
                id="admin-activation-code"
                type="password"
                autoComplete="one-time-code"
                value={activationCode}
                onChange={(event) => setActivationCode(event.target.value)}
                dir="ltr"
                required
                disabled={pending}
              />
              <button type="submit" className="primary-button" disabled={pending}>
                {pending ? "در حال فعال‌سازی..." : "فعال‌سازی و ورود"}
              </button>
            </form>
          )}
        </>
      )}

      {step === "mfa-challenge" && (
        <form onSubmit={verifyMfa} className="auth-form">
          <div className="auth-security-mark" aria-hidden="true">
            2FA
          </div>
          <h2>تأیید دومرحله‌ای</h2>
          <p className="auth-help">
            برای حساب‌های کارکنان، Command Center نشست AAL2 را الزامی می‌کند. کد فعلی Authenticator
            را وارد کنید.
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
            QR را با Google Authenticator، Microsoft Authenticator، 1Password یا برنامه TOTP مشابه
            اسکن کنید و سپس کد را وارد کنید.
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
