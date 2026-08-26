import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getBreakGlassRequests } from "@/src/lib/admin-api/break-glass";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { BreakGlassRequestForm, BreakGlassReviewForm } from "./BreakGlassForms";
import styles from "./break-glass.module.css";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

export default async function BreakGlassPage() {
  const admin = await requireAdminAccess();
  const canRequest = admin.permissions.includes("security.break_glass.request");
  const canApprove = admin.permissions.includes("security.break_glass.approve");
  if (!canRequest && !canApprove) redirect("/forbidden");

  const result = await getBreakGlassRequests();
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");

  const items = result.kind === "ok" ? result.items : [];

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="security"
        title="Break-glass"
        subtitle="دسترسی زمان‌دار، target-scoped و قابل Audit به داده حساس"
      >
        <div className={styles.page}>
          <section className={styles.hero}>
            <div>
              <p className="eyebrow">Sensitive access · AAL2 · Default deny</p>
              <h2>Break-glass Sensitive Access</h2>
              <p>
                درخواست، تأیید و لغو فقط از قرارداد canonical انجام می‌شود. Relationship یا Founder
                role به‌تنهایی هیچ دسترسی health ایجاد نمی‌کند.
              </p>
            </div>
            <Link href="/security">بازگشت به Security</Link>
          </section>

          <section className={styles.boundary} aria-label="مرزهای امنیتی Break-glass">
            <strong>مرزهای اجباری</strong>
            <p>
              Self-approval ممنوع است؛ Women Health حداکثر ۳۰ دقیقه و Health حداکثر ۶۰ دقیقه؛
              expiration/revoke در هر elevated read دوباره بررسی می‌شود؛ هیچ payload سلامت در این
              صفحه یا Audit نمایش داده نمی‌شود.
            </p>
          </section>

          {canRequest ? (
            <section className={styles.panel} aria-labelledby="request-title">
              <div className={styles.heading}>
                <div>
                  <p className="eyebrow">Request authority</p>
                  <h3 id="request-title">درخواست دسترسی موقت</h3>
                </div>
                <code>security.break_glass.request</code>
              </div>
              <BreakGlassRequestForm />
            </section>
          ) : null}

          <section className={styles.panel} aria-labelledby="history-title">
            <div className={styles.heading}>
              <div>
                <p className="eyebrow">Lifecycle history</p>
                <h3 id="history-title">درخواست‌ها و وضعیت‌ها</h3>
              </div>
              <span>{result.kind === "ok" ? formatDate(result.asOfUtc) : "Unavailable"}</span>
            </div>

            {result.kind !== "ok" ? (
              <AdminPageState
                state="unavailable"
                title="Break-glass API در دسترس نیست"
                description="هیچ کنترل حساس به fallback مستقیم DB یا داده نمایشی تبدیل نمی‌شود."
              />
            ) : items.length === 0 ? (
              <AdminPageState state="empty" title="درخواست Break-glass ثبت نشده است" />
            ) : (
              <div className={styles.list}>
                {items.map((item) => (
                  <article key={item.requestId} className={styles.card} data-status={item.status}>
                    <header>
                      <div>
                        <strong>{item.capability}</strong>
                        <code>{item.requestId}</code>
                      </div>
                      <span>{item.status}</span>
                    </header>
                    <dl>
                      <div>
                        <dt>Person</dt>
                        <dd>
                          <code>{item.subjectPersonId}</code>
                        </dd>
                      </div>
                      <div>
                        <dt>TTL</dt>
                        <dd>{item.ttlMinutes.toLocaleString("fa-IR")} دقیقه</dd>
                      </div>
                      <div>
                        <dt>Requested</dt>
                        <dd>{formatDate(item.requestedAtUtc)}</dd>
                      </div>
                      <div>
                        <dt>Expires</dt>
                        <dd>{formatDate(item.expiresAtUtc)}</dd>
                      </div>
                      <div>
                        <dt>Version</dt>
                        <dd>{item.version.toLocaleString("fa-IR")}</dd>
                      </div>
                    </dl>
                    <p>{item.reason}</p>
                    {item.reviewReason ? <small>Review: {item.reviewReason}</small> : null}
                    <BreakGlassReviewForm
                      item={item}
                      canApprove={canApprove}
                      canRequest={canRequest}
                    />
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
