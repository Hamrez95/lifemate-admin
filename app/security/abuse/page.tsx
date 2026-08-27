import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getAbuseWorkspace } from "@/src/lib/admin-api/abuse-rules";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { AbuseRuleForm, RetireRuleForm } from "./AbuseControls";
import styles from "./abuse.module.css";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

export default async function AbuseRulesPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("security.abuse.read")) redirect("/forbidden");
  const canWrite = admin.permissions.includes("security.abuse.write");
  const result = await getAbuseWorkspace();
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");
  const data = result.kind === "ok" ? result.data : null;

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="security"
        title="Fraud / Abuse Rules"
        subtitle="Ruleهای explainable برای تخفیف، Gift، Refund و Reward با review قابل ممیزی"
      >
        <main className={styles.page} dir="rtl">
          <nav className={styles.breadcrumbs} aria-label="مسیر صفحه">
            <Link href="/security">امنیت</Link>
            <span aria-hidden="true">/</span>
            <span>Fraud &amp; Abuse</span>
          </nav>

          <section className={styles.hero} aria-labelledby="abuse-title">
            <div>
              <p className="eyebrow">P0 · Core #503</p>
              <h2 id="abuse-title">Rule Engine قابل توضیح، نه Risk Score مبهم</h2>
              <p>
                تصمیم‌ها فقط Allow، Deny یا RequireApproval هستند و هر تصمیم Rule ID و reason code دارد.
                این نسخه هیچ اقدام تنبیهی خودکار روی حساب و هیچ استفاده‌ای از داده سلامت ندارد.
              </p>
            </div>
            <aside>
              <strong>Privacy boundary</strong>
              <span>
                {data && !data.privacy.subjectIdentifiersExposed && !data.privacy.rawContactValuesExposed
                  ? "Subject و contact در decision feed مخفی هستند"
                  : "Unavailable"}
              </span>
            </aside>
          </section>

          {!data ? (
            <section className={styles.unavailable} role="status" aria-live="polite">
              <strong>قرارداد Abuse Rules در دسترس نیست.</strong>
              <p>هیچ rule یا risk decision محلی ساخته یا از داده‌های دیگر استنتاج نمی‌شود.</p>
            </section>
          ) : (
            <>
              <section className={styles.metrics} aria-label="Abuse engine summary">
                <article><span>Rules</span><strong>{data.rules.length.toLocaleString("fa-IR")}</strong></article>
                <article><span>Active</span><strong>{data.rules.filter((rule) => rule.status === "Active").length.toLocaleString("fa-IR")}</strong></article>
                <article><span>Recent decisions</span><strong>{data.decisions.length.toLocaleString("fa-IR")}</strong></article>
                <article><span>As of</span><strong className={styles.dateMetric}>{formatDate(data.freshness.asOfUtc)}</strong></article>
              </section>

              <section className={styles.panel} aria-labelledby="rule-editor-title">
                <header>
                  <div><p className="eyebrow">Explainable policy</p><h3 id="rule-editor-title">ساخت / ویرایش Rule</h3></div>
                  <span>{canWrite ? "security.abuse.write" : "Read only"}</span>
                </header>
                <AbuseRuleForm canWrite={canWrite} />
              </section>

              <section className={styles.panel} aria-labelledby="rule-list-title">
                <header>
                  <div><p className="eyebrow">Current rules</p><h3 id="rule-list-title">Rule registry</h3></div>
                  <span>{data.rules.length.toLocaleString("fa-IR")} rule</span>
                </header>
                <div className={styles.rules}>
                  {data.rules.length === 0 ? (
                    <div className={styles.empty}>هنوز Rule canonical تعریف نشده است.</div>
                  ) : data.rules.map((rule) => (
                    <article className={styles.ruleCard} key={rule.id}>
                      <header>
                        <div><strong>{rule.displayName}</strong><code>{rule.contextCode} · {rule.code}</code></div>
                        <span>{rule.status} · v{rule.version}</span>
                      </header>
                      <dl>
                        <div><dt>Kind</dt><dd>{rule.ruleKind}</dd></div>
                        <div><dt>Subject</dt><dd>{rule.subjectScope}</dd></div>
                        <div><dt>Action</dt><dd>{rule.enforcementAction}</dd></div>
                        <div><dt>Priority</dt><dd>{rule.priority}</dd></div>
                      </dl>
                      <p className={styles.ruleShape}>
                        window={rule.windowSeconds ?? "—"} · max={rule.maxCount ?? "—"} · cooldown={rule.cooldownSeconds ?? "—"} · evidence={rule.evidenceCode ?? "—"}
                      </p>
                      <RetireRuleForm rule={rule} canWrite={canWrite} />
                    </article>
                  ))}
                </div>
              </section>

              <section className={styles.panel} aria-labelledby="decision-title">
                <header>
                  <div><p className="eyebrow">Review queue</p><h3 id="decision-title">Recent decisions</h3></div>
                  <span>بدون subject identifier</span>
                </header>
                <div className={styles.tableWrap}>
                  <table>
                    <thead><tr><th>Context</th><th>Action</th><th>Reasons</th><th>Matched rules</th><th>Time</th></tr></thead>
                    <tbody>
                      {data.decisions.length === 0 ? (
                        <tr><td colSpan={5} className={styles.emptyCell}>تصمیمی ثبت نشده است.</td></tr>
                      ) : data.decisions.map((decision) => (
                        <tr key={decision.id}>
                          <td>{decision.contextCode}</td>
                          <td><strong>{decision.finalAction}</strong></td>
                          <td>{decision.reasonCodes.join(", ") || "—"}</td>
                          <td>{decision.matchedRuleIds.length.toLocaleString("fa-IR")}</td>
                          <td>{formatDate(decision.evaluatedAtUtc)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
