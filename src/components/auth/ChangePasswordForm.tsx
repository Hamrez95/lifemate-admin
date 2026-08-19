"use client";

import { type FormEvent, useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/src/lib/supabase/client";

export function ChangePasswordForm() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (newPassword.length < 8) {
      setMessage("رمز عبور جدید باید حداقل ۸ کاراکتر باشد.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("تکرار رمز عبور با رمز عبور جدید یکسان نیست.");
      return;
    }

    setPending(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        currentPassword,
      });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("رمز عبور با موفقیت تغییر کرد.");
    } catch {
      setMessage("تغییر رمز عبور انجام نشد. رمز فعلی را بررسی کنید و دوباره تلاش کنید.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="profile-password-card" aria-labelledby="password-card-title">
      <div>
        <p className="eyebrow">Account Security</p>
        <h2 id="password-card-title">تغییر رمز عبور</h2>
      </div>
      <p>
        برای تغییر رمز، رمز فعلی و رمز جدید را وارد کنید. رمز در Supabase Auth نگهداری می‌شود و در
        دیتابیس Admin ذخیره نمی‌شود.
      </p>
      <form className="profile-password-form" onSubmit={changePassword}>
        <label htmlFor="profile-current-password">رمز عبور فعلی</label>
        <input
          id="profile-current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          dir="ltr"
          required
          disabled={pending}
        />
        <label htmlFor="profile-new-password">رمز عبور جدید</label>
        <input
          id="profile-new-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          dir="ltr"
          required
          disabled={pending}
        />
        <label htmlFor="profile-confirm-password">تکرار رمز عبور جدید</label>
        <input
          id="profile-confirm-password"
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
          {pending ? "در حال تغییر..." : "تغییر رمز عبور"}
        </button>
      </form>
      {message && (
        <p className="profile-password-message" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
}
