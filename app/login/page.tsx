import type { Metadata } from "next";

import { AdminLoginFlow } from "@/src/components/auth/AdminLoginFlow";
import { LifeMateLogo } from "@/src/components/brand/LifeMateLogo";

export const metadata: Metadata = {
  title: "ورود به Command Center",
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-stage">
        <section className="auth-visual" aria-label="LifeMate Command Center">
          <div className="auth-visual__glow auth-visual__glow--one" />
          <div className="auth-visual__glow auth-visual__glow--two" />
          <div className="auth-visual__content">
            <LifeMateLogo hero />
            <p className="auth-visual__eyebrow">LifeMate Ecosystem</p>
            <h2>یک مرکز برای مدیریت تمام تجربه‌ی LifeMate</h2>
            <p>
              دسترسی کارکنان ساده و سریع است، اما Role و Permission همچنان جدا، کنترل‌شده و قابل
              Audit باقی می‌ماند.
            </p>
            <div className="auth-visual__chips" aria-hidden="true">
              <span>WellMate</span>
              <span>CareMate</span>
              <span>LifeMate</span>
            </div>
          </div>
        </section>

        <section className="auth-card" aria-labelledby="admin-login-title">
          <div className="auth-card__brand">
            <LifeMateLogo />
            <span className="state-pill state-pill--safe">Internal Access</span>
          </div>
          <div className="auth-card__intro">
            <p className="eyebrow">LifeMate Command Center</p>
            <h1 id="admin-login-title">خوش آمدید 👋</h1>
            <p>
              با نام کاربری و رمز عبور وارد شوید. کارکنان جدید هم می‌توانند ثبت‌نام کنند و بعد از
              تخصیص Role توسط مدیر سیستم دسترسی بگیرند.
            </p>
          </div>
          <AdminLoginFlow />
          <div className="auth-card__security-note">
            <span aria-hidden="true">◇</span>
            <p>
              ثبت‌نام یا ورود به‌تنهایی دسترسی مدیریتی ایجاد نمی‌کند؛ مجوزها در Admin Control Plane
              و به‌صورت server-side اعمال می‌شوند.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
