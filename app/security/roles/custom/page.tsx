import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getCustomRoles } from "@/src/lib/admin-api/custom-roles";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { CreateCustomRoleForm, CustomRoleCard } from "./CustomRoleControls";
import styles from "./custom-roles.module.css";

function formatAsOf(value: string): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

export default async function CustomRolesPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("security.audit.read")) redirect("/forbidden");
  const canWrite = admin.permissions.includes("security.roles.write");

  const result = await getCustomRoles();
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");
  const data = result.kind === "ok" ? result.data : null;

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="security"
        title="نقش‌های سفارشی"
        subtitle="Custom Roles با allow-list، concurrency و Audit canonical"
      >
        <main className={styles.page} dir="rtl">
          <nav className={styles.breadcrumbs} aria-label="مسیر صفحه">
            <Link href="/security">امنیت</Link>
            <span aria-hidden="true">/</span>
            <span>نقش‌های سفارشی</span>
          </nav>

          <section className={styles.hero} aria-labelledby="custom-roles-title">
            <div>
              <p className="eyebrow">P0 · Core #490</p>
              <h2 id="custom-roles-title">مدیریت نقش سفارشی بدون دورزدن RBAC</h2>
              <p>
                فقط permissionهای role-assignable و در محدوده اختیار actor قابل واگذاری هستند. Founder
                و permissionهای Elevated از این workflow عادی قابل ساخت یا واگذاری نیستند.
              </p>
            </div>
            <div className={styles.sourceCard}>
              <span>Canonical source</span>
              <strong>LifeMate Admin API</strong>
              <small>{data ? `As of ${formatAsOf(data.freshness.asOfUtc)}` : "Unavailable"}</small>
            </div>
          </section>

          {!data ? (
            <section className={styles.unavailable} role="status" aria-live="polite">
              <strong>قرارداد Custom Role فعلاً در دسترس نیست.</strong>
              <p>هیچ role یا permission محلی/فرضی برای جایگزینی پاسخ Core ساخته نمی‌شود.</p>
            </section>
          ) : (
            <>
              <section className={styles.metrics} aria-label="خلاصه نقش‌های سفارشی">
                <article><span>Custom Role</span><strong>{data.roles.length.toLocaleString("fa-IR")}</strong></article>
                <article><span>Permission قابل بررسی</span><strong>{data.permissionCatalog.length.toLocaleString("fa-IR")}</strong></article>
                <article><span>قابل واگذاری توسط شما</span><strong>{data.permissionCatalog.filter((item) => item.delegable).length.toLocaleString("fa-IR")}</strong></article>
              </section>

              <section className={styles.panel} aria-labelledby="create-role-title">
                <header>
                  <div><p className="eyebrow">Create</p><h3 id="create-role-title">نقش سفارشی جدید</h3></div>
                  <span>{canWrite ? "security.roles.write" : "Read only"}</span>
                </header>
                <CreateCustomRoleForm canWrite={canWrite} />
              </section>

              <section className={styles.roles} aria-label="نقش‌های سفارشی">
                {data.roles.length === 0 ? (
                  <div className={styles.empty}>هنوز نقش سفارشی ساخته نشده است.</div>
                ) : (
                  data.roles.map((role) => (
                    <CustomRoleCard key={role.code} role={role} catalog={data.permissionCatalog} canWrite={canWrite} />
                  ))
                )}
              </section>

              <section className={styles.catalog} aria-labelledby="permission-catalog-title">
                <header><div><p className="eyebrow">Allow-listed catalog</p><h3 id="permission-catalog-title">Permission Catalog</h3></div></header>
                <div className={styles.permissionCatalog}>
                  {data.permissionCatalog.map((permission) => (
                    <article key={permission.code} data-delegable={permission.delegable}>
                      <code>{permission.code}</code>
                      <span>{permission.domain} · {permission.riskLevel}</span>
                      <p>{permission.description}</p>
                      <strong>{permission.delegable ? "قابل واگذاری توسط actor" : "خارج از اختیار actor"}</strong>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
