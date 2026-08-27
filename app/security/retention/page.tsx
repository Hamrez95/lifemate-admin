import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getRetentionWorkspace } from "@/src/lib/admin-api/retention-operations";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import {
  PolicyRow,
  RetentionHoldCard,
  RetentionHoldForm,
  RetentionPolicyForm,
} from "./RetentionControls";
import styles from "./retention.module.css";

function formatAsOf(value: string): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

export default async function RetentionOperationsPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("security.retention.read")) redirect("/forbidden");
  const canWrite = admin.permissions.includes("security.retention.write");
  const result = await getRetentionWorkspace();
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");
  const data = result.kind === "ok" ? result.data : null;

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="security"
        title="Data Lifecycle & Retention"
        subtitle="Policy versioning، delete-request preview و holdهای audit‌شده بدون حذف مستقیم داده"
      >
        <main className={styles.page} dir="rtl">
          <nav className={styles.breadcrumbs} aria-label="مسیر صفحه">
            <Link href="/security">امنیت</Link>
            <span aria-hidden="true">/</span>
            <span>Data Lifecycle</span>
          </nav>

          <section className={styles.hero} aria-labelledby="retention-title">
            <div>
              <p className="eyebrow">P0 · Core #502</p>
              <h2 id="retention-title">Retention policy با مرز روشن از Subscription</h2>
              <p>
                پایان subscription فقط entitlement را تغییر می‌دهد و به معنی حذف داده نیست. این
                workspace policy و hold را مدیریت می‌کند؛ purge واقعی فقط توسط workflow canonical و
                قابل‌بازیابی backend انجام می‌شود.
              </p>
            </div>
            <div className={styles.sourceCard}>
              <span>Canonical source</span>
              <strong>LifeMate Admin API</strong>
              <small>
                {data ? `As of ${formatAsOf(data.preview.freshness.asOfUtc)}` : "Unavailable"}
              </small>
            </div>
          </section>

          {!data ? (
            <section className={styles.unavailable} role="status" aria-live="polite">
              <strong>قرارداد retention در دسترس نیست.</strong>
              <p>
                هیچ policy، delete count یا hold محلی ساخته نمی‌شود و browser به دیتابیس fallback
                نمی‌کند.
              </p>
            </section>
          ) : (
            <>
              <section className={styles.metrics} aria-label="Deletion lifecycle preview">
                <article>
                  <span>درخواست باز</span>
                  <strong>{data.preview.pendingCount.toLocaleString("fa-IR")}</strong>
                </article>
                <article>
                  <span>واجد شرایط اجرا</span>
                  <strong>{data.preview.eligibleCount.toLocaleString("fa-IR")}</strong>
                </article>
                <article>
                  <span>متوقف‌شده با Hold</span>
                  <strong>{data.preview.heldCount.toLocaleString("fa-IR")}</strong>
                </article>
                <article className={styles.safeMetric}>
                  <span>عملیات مخرب در Preview</span>
                  <strong>{data.preview.destructiveActionPerformed ? "بله" : "خیر"}</strong>
                </article>
              </section>

              <section className={styles.notice} role="note">
                <strong>Dry-run only</strong>
                <p>
                  این صفحه دکمه حذف مستقیم row ندارد. Preview فقط impact را می‌خواند؛
                  حذف/ناشناس‌سازی باید از worker canonical، idempotent و fail-closed عبور کند.
                </p>
              </section>

              <section className={styles.panel} aria-labelledby="policy-editor-title">
                <header>
                  <div>
                    <p className="eyebrow">Versioned policy</p>
                    <h3 id="policy-editor-title">نسخه جدید Retention Policy</h3>
                  </div>
                  <span>{canWrite ? "security.retention.write" : "Read only"}</span>
                </header>
                <RetentionPolicyForm canWrite={canWrite} />
              </section>

              <section className={styles.panel} aria-labelledby="policy-history-title">
                <header>
                  <div>
                    <p className="eyebrow">History</p>
                    <h3 id="policy-history-title">Policy history</h3>
                  </div>
                  <span>{data.policies.length.toLocaleString("fa-IR")} رکورد</span>
                </header>
                <div className={styles.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th>Category / Purpose</th>
                        <th>Retention</th>
                        <th>Grace</th>
                        <th>Disposition</th>
                        <th>Version</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.policies.length === 0 ? (
                        <tr>
                          <td colSpan={6} className={styles.emptyCell}>
                            هیچ policy canonical ثبت نشده است.
                          </td>
                        </tr>
                      ) : (
                        data.policies.map((policy) => (
                          <PolicyRow
                            key={`${policy.dataCategory}:${policy.purposeCode}:${policy.policyVersion}`}
                            policy={policy}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.panel} aria-labelledby="hold-create-title">
                <header>
                  <div>
                    <p className="eyebrow">Operational hold</p>
                    <h3 id="hold-create-title">ایجاد Hold</h3>
                  </div>
                  <span>Account-scoped · Audited</span>
                </header>
                <RetentionHoldForm canWrite={canWrite} />
              </section>

              <section className={styles.panel} aria-labelledby="hold-list-title">
                <header>
                  <div>
                    <p className="eyebrow">Hold registry</p>
                    <h3 id="hold-list-title">Holdهای ثبت‌شده</h3>
                  </div>
                  <span>{data.holds.length.toLocaleString("fa-IR")} رکورد</span>
                </header>
                <div className={styles.holds}>
                  {data.holds.length === 0 ? (
                    <div className={styles.empty}>هیچ hold canonical وجود ندارد.</div>
                  ) : (
                    data.holds.map((hold) => (
                      <RetentionHoldCard key={hold.id} hold={hold} canWrite={canWrite} />
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
