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
          <h1 id="admin-login-title">ورود امن اعضای تیم</h1>
          <p>
            Command Center فقط برای اعضای دعوت‌شده‌ی تیم است. هویت ورود از دسترسی مدیریتی جداست و
            بعد از ورود، تأیید دومرحله‌ای AAL2 برای همه اجباری است.
          </p>
        </div>
        <AdminLoginFlow />
        <div className="auth-card__security-note">
          <span aria-hidden="true">▱</span>
          <p>
            ورود موفق هیچ دسترسی خودکاری ایجاد نمی‌کند؛ Role و Permission فقط از Admin Control Plane
            و با ثبت Audit اعمال می‌شوند.
          </p>
        </div>
      </section>
    </main>
  );
}
