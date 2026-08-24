import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCommerceOverview,
  type CommerceOverviewResponse,
} from "@/src/lib/admin-api/commerce-overview";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import {
  CommerceDependencyGrid,
  CommerceWorkspaceHeader,
  CoreDependencyNotice,
} from "../CommerceWorkspaceHeader";
import styles from "../commerce-reference.module.css";

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function RevenueMetricsUnavailable() {
  const metrics = [
    ["MRR جاری", "تعریف/endpoint درآمد ماهانه موجود نیست", "green"],
    ["ARR جاری", "بدون منبع canonical محاسبه نمی‌شود", "blue"],
    ["ARPU", "نیازمند درآمد و کاربر پرداخت‌کننده canonical", "violet"],
    ["Paid conversion", "قیف پرداخت canonical در Commerce Overview نیست", "blue"],
    ["Churn درآمدی", "تعریف revenue churn موجود نیست", "orange"],
    ["Refund amount", "تعداد وضعیت Refund با مبلغ بازپرداخت یکی نیست", "orange"],
  ] as const;

  return (
    <section className={styles.metricGrid} aria-label="شاخص‌های درآمد تکرارشونده">
      {metrics.map(([label, hint, tone]) => (
        <article className={styles.metricCard} data-tone={tone} key={label}>
          <span>{label}</span>
          <strong aria-label={`${label} در دسترس نیست`}>—</strong>
          <small>{hint}</small>
        </article>
      ))}
    </section>
  );
}

function SubscriptionContext({ data }: { data: CommerceOverviewResponse }) {
  const summary = data.summary.subscriptions;
  const rows = [
    ["اشتراک فعال", summary.active],
    ["Trial", summary.trial],
    ["Past due", summary.pastDue],
    ["Refunded status", summary.refunded],
  ] as const;

  return (
    <section className={styles.panel} aria-labelledby="revenue-context-title">
      <header className={styles.panelHeader}>
        <div>
          <span>CANONICAL CONTEXT</span>
          <h3 id="revenue-context-title">زمینه عملیاتی موجود برای درآمد</h3>
          <p>این اعداد revenue نیستند؛ فقط وضعیت Subscription در read-model Core هستند.</p>
        </div>
      </header>
      <ul className={styles.list}>
        {rows.map(([label, value]) => (
          <li key={label}>
            <strong>{label}</strong>
            <span>{value.toLocaleString("fa-IR")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlanContext({ data }: { data: CommerceOverviewResponse }) {
  return (
    <section className={styles.panel} aria-labelledby="revenue-plan-title">
      <header className={styles.panelHeader}>
        <div>
          <span>PLAN DISTRIBUTION</span>
          <h3 id="revenue-plan-title">توزیع اشتراک روی پلن‌ها</h3>
          <p>برای تحلیل mix استفاده می‌شود؛ قیمت یا درآمد از این تعدادها استنتاج نمی‌شود.</p>
        </div>
      </header>
      {data.planDistribution.length === 0 ? (
        <AdminPageState state="empty" title="پلنی برای نمایش وجود ندارد" />
      ) : (
        <ul className={styles.list}>
          {data.planDistribution.slice(0, 8).map((row) => (
            <li key={row.planId}>
              <div>
                <Link href={`/commerce/plans/${row.planId}`}>
                  <strong>{row.planName}</strong>
                </Link>
                <br />
                <span>
                  {row.productName} · {row.planCode}
                </span>
              </div>
              <span>{row.subscriptions.toLocaleString("fa-IR")} اشتراک</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function RevenueContent() {
  const result = await getCommerceOverview(new URLSearchParams({ page: "1", pageSize: "25" }));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid")
    return <AdminPageState state="error" title="درخواست Commerce معتبر نیست" />;
  if (result.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }

  const { data } = result;

  return (
    <div className={styles.page} dir="rtl">
      <CommerceWorkspaceHeader
        active="revenue"
        eyebrow="Commerce · Reference 11"
        title="درآمد تکرارشونده، بدون KPI ساختگی"
        description="طرح مرجع MRR، ARR، ARPU، conversion و churn را نشان می‌دهد؛ اما Command Center فقط زمانی عدد می‌دهد که Core تعریف و endpoint canonical همان KPI را برگرداند."
      />
      <RevenueMetricsUnavailable />
      <section className={styles.unavailablePanel} aria-labelledby="revenue-dependency-title">
        <div className={styles.unavailableIcon} aria-hidden="true">
          !
        </div>
        <div>
          <h3 id="revenue-dependency-title">
            Revenue KPI endpoint هنوز در قرارداد فعلی Core وجود ندارد
          </h3>
          <p>
            از تعداد Subscription، قیمت فعلی Plan یا Transactionهای ناقص، MRR/ARR/ARPU محاسبه
            نمی‌کنیم؛ چون grandfathered pricing، refund، currency، billing period و migration
            semantics می‌توانند نتیجه را غلط کنند.
          </p>
          <p>
            <code>Required: canonical recurring-revenue read model + KPI definitions</code>
          </p>
        </div>
      </section>
      <CommerceDependencyGrid>
        <CoreDependencyNotice title="Price source" tone="available">
          قیمت فقط در صفحه مدیریت Plan از قرارداد versioned pricing Core نمایش داده و زمان‌بندی
          می‌شود؛ این صفحه قیمت را از تعداد اشتراک حدس نمی‌زند.
        </CoreDependencyNotice>
        <CoreDependencyNotice title="Trial · Entitlement · Discount · Core #412">
          mutationهای باقی‌مانده Monetization تا تکمیل Core #412 در UI درآمد یا برنامه‌های فروش فعال
          نمی‌شوند.
        </CoreDependencyNotice>
        <CoreDependencyNotice title="Revenue mutation" tone="info">
          صفحه درآمد read-only است. هیچ action برای reprice، migrate یا دست‌کاری Subscription فعال
          ندارد.
        </CoreDependencyNotice>
      </CommerceDependencyGrid>
      <div className={styles.sectionGrid}>
        <SubscriptionContext data={data} />
        <PlanContext data={data} />
      </div>
      <section className={styles.panel} aria-labelledby="revenue-freshness-title">
        <header className={styles.panelHeader}>
          <div>
            <span>FRESHNESS</span>
            <h3 id="revenue-freshness-title">منبع snapshot عملیاتی</h3>
            <p>
              Commerce Overview: {data.freshness.status === "fresh" ? "تازه" : "قدیمی"} ·{" "}
              {formatDateTime(data.freshness.asOfUtc)}. این timestamp فقط وضعیت داده عملیاتی را نشان
              می‌دهد، نه freshness یک KPI درآمدی که هنوز وجود ندارد.
            </p>
          </div>
        </header>
      </section>
    </div>
  );
}

export default async function CommerceRevenuePage() {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("commerce.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="درآمد تکرارشونده"
        subtitle="Reference 11 با KPIهای fail-closed تا آماده‌شدن قرارداد Core"
      >
        {!canRead ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense
            fallback={<AdminPageState state="loading" title="در حال دریافت snapshot تجارت" />}
          >
            <RevenueContent />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
