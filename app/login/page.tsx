import type { Metadata } from "next";

import { AdminLoginFlow } from "@/src/components/auth/AdminLoginFlow";
import { LifeMateLogo } from "@/src/components/brand/LifeMateLogo";

export const metadata: Metadata = {
  title: "ورود امن",
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="admin-login-title">
        <div className="auth-card__brand">
          <LifeMateLogo />
          <span className="state-pill state-pill--safe">Internal Access</span>
        </div>
        <div className="auth-card__intro">
          <p className="eyebrow">LifeMate Command Center</p>
          <h1 id="admin-login-title">ورود امن به مرکز فرماندهی</h1>
          <p>
            فقط اعضای تأییدشده‌ی تیم می‌توانند وارد شوند. بعد از کد ورود، تأیید دومرحله‌ای AAL2
            اجباری است.
          </p>
        </div>
        <AdminLoginFlow />
        <div className="auth-card__security-note">
          <span aria-hidden="true">▱</span>
          <p>
            این صفحه هیچ service-role، رمز دیتابیس یا کلید مدیریتی را دریافت یا نگهداری نمی‌کند.
          </p>
        </div>
      </section>
    </main>
  );
}
