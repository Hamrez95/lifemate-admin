"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/src/lib/supabase/client";

export function SessionControlPanel() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function signOutEverywhere() {
    if (!window.confirm("از همهٔ دستگاه‌ها خارج شویم؟ برای ورود دوباره MFA لازم است.")) return;
    setPending(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch {
      setMessage("خروج از همهٔ دستگاه‌ها انجام نشد. دوباره تلاش کنید.");
      setPending(false);
    }
  }

  return (
    <section className="section-card profile-sessions-card" aria-labelledby="sessions-card-title">
      <div className="section-card__header">
        <div>
          <p className="eyebrow">Session control</p>
          <h2 id="sessions-card-title">نشست‌ها و دستگاه‌ها</h2>
        </div>
        <span className="state-pill">قابل کنترل</span>
      </div>
      <p>
        این اقدام همهٔ نشست‌های فعال حساب را می‌بندد. برای ورود دوباره به Command Center، نام
        کاربری، رمز عبور و MFA لازم است.
      </p>
      <button
        type="button"
        className="text-button profile-session-button"
        onClick={signOutEverywhere}
        disabled={pending}
      >
        {pending ? "در حال خروج..." : "خروج از همهٔ دستگاه‌ها"}
      </button>
      {message && (
        <p
          className="profile-password-message"
          data-tone="error"
          role="alert"
          aria-live="assertive"
        >
          {message}
        </p>
      )}
    </section>
  );
}
