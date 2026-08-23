import type { Metadata } from "next";
import Image from "next/image";

import { AdminLoginFlow } from "@/src/components/auth/AdminLoginFlow";
import { LifeMateLogo } from "@/src/components/brand/LifeMateLogo";

export const metadata: Metadata = {
  title: "ورود امن به Command Center",
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <header className="auth-header">
          <LifeMateLogo />
          <div>
            <h1>ورود امن به مرکز فرماندهی LifeMate</h1>
            <p>دسترسی فقط برای کاربران داخلی مجاز</p>
          </div>
        </header>

        <div className="auth-trust-row" aria-label="کنترل‌های امنیتی ورود">
          <span>دسترسی مبتنی بر Role و Permission</span>
          <span>نشست کارکنان با AAL2 محافظت می‌شود</span>
          <span>هیچ داده مدیریتی بدون احراز هویت نمایش داده نمی‌شود</span>
        </div>

        <div className="auth-stage">
          <section className="auth-visual" aria-label="تصویر امنیت ورود LifeMate">
            <div className="auth-visual__content">
              <Image
                src="/design-assets/login-mfa-hero-v1.png"
                alt="تصویر مفهومی ورود امن و تأیید دومرحله‌ای LifeMate"
                width={900}
                height={900}
                priority
                sizes="(max-width: 900px) 100vw, 48vw"
                className="auth-visual__image"
              />
              <div className="auth-visual__copy">
                <p className="eyebrow">LifeMate Security</p>
                <h2>ورود ساده، دسترسی کنترل‌شده</h2>
                <p>
                  ورود، فعال‌سازی Founder و MFA همان مسیر امنیتی فعلی را طی می‌کنند و مجوزها فقط
                  سمت سرور تصمیم‌گیری می‌شوند.
                </p>
              </div>
            </div>
          </section>

          <section className="auth-card" aria-labelledby="admin-login-title">
            <div className="auth-card__brand">
              <span className="state-pill state-pill--safe">Secure Internal Access</span>
              <span className="auth-card__lock" aria-hidden="true">
                ◇
              </span>
            </div>
            <div className="auth-card__intro">
              <p className="eyebrow">LifeMate Command Center</p>
              <h2 id="admin-login-title">ورود به حساب مدیریتی</h2>
              <p>اطلاعات حساب را وارد کنید؛ در صورت نیاز، مرحله MFA بعد از ورود نمایش داده می‌شود.</p>
            </div>
            <AdminLoginFlow />
            <div className="auth-card__security-note">
              <span aria-hidden="true">⌾</span>
              <p>ورود موفق به‌تنهایی مجوز مدیریتی ایجاد نمی‌کند؛ کنترل دسترسی fail-closed است.</p>
            </div>
          </section>
        </div>

        <footer className="auth-footer">
          <span>LifeMate Command Center</span>
          <span>Secure workforce access</span>
        </footer>
      </div>
    </main>
  );
}
