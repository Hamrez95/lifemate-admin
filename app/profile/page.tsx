import type { Metadata } from "next";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { ChangePasswordForm } from "@/src/components/auth/ChangePasswordForm";
import { SecurityFactorsPanel } from "@/src/components/auth/SecurityFactorsPanel";
import { SessionControlPanel } from "@/src/components/auth/SessionControlPanel";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { Page } from "@/src/components/ui";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

export const metadata: Metadata = {
  title: "پروفایل و امنیت",
};

export default async function ProfilePage() {
  const admin = await requireAdminAccess();

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="profile"
        title="پروفایل و امنیت"
        subtitle="مدیریت اطلاعات ورود و امنیت حساب Command Center"
      >
        <Page className="profile-security-grid">
          <section
            className="section-card profile-identity-card"
            aria-labelledby="identity-card-title"
          >
            <div className="section-card__header">
              <div>
                <p className="eyebrow">Workforce identity</p>
                <h2 id="identity-card-title">هویت مدیریتی</h2>
              </div>
              <span className="state-pill state-pill--safe">دعوت‌شده</span>
            </div>
            <dl className="profile-identity-list">
              <div>
                <dt>شناسهٔ حساب</dt>
                <dd dir="ltr">
                  {admin.accountId.slice(0, 8)}…{admin.accountId.slice(-4)}
                </dd>
              </div>
              <div>
                <dt>نقش فعال</dt>
                <dd>{admin.roles.length ? admin.roles.join(" · ") : "نقش ثبت نشده"}</dd>
              </div>
              <div>
                <dt>نام کاربری</dt>
                <dd>توسط Admin API مدیریت می‌شود</dd>
              </div>
            </dl>
            <p className="profile-identity-card__note">
              تغییر نام کاربری تا زمان آماده‌شدن قرارداد یکتایی، تاریخچه و audit در Admin API عمداً
              در این پنل فعال نیست.
            </p>
          </section>
          <ChangePasswordForm />
          <SecurityFactorsPanel />
          <SessionControlPanel />
        </Page>
      </AdminShell>
    </AdminSessionProvider>
  );
}
