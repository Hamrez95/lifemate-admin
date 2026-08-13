import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getAnalyticsCatalog, type AnalyticsKpiDefinition } from "@/src/lib/admin-api/analytics-catalog";
import { getKpiValues, type KpiValue } from "@/src/lib/admin-api/analytics-kpis";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./product-kpis.module.css";

type AnalyticsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function scalar(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function toApiParams(input: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  const from = scalar(input.from);
  const to = scalar(input.to);
  const product = scalar(input.product);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (product) params.set("product", product);
  return params;
}

function formatNumber(value: number | null, unit: AnalyticsKpiDefinition["unit"]): string {
  if (value === null) return "—";
  if (unit === "rate") {
    return `${(value * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
  }
  return value.toLocaleString("fa-IR");
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function AnalyticsFilters({ input }: { input: Record<string, string | string[] | undefined> }) {
  return (
    <form className={styles.filters} action="/analytics" method="get" aria-label="فیلتر داشبورد محصول">
      <div className={styles.filterField}>
        <label htmlFor="analytics-from">از تاریخ</label>
        <input id="analytics-from" name="from" type="date" defaultValue={scalar(input.from)} />
      </div>
      <div className={styles.filterField}>
        <label htmlFor="analytics-to">تا تاریخ</label>
        <input id="analytics-to" name="to" type="date" defaultValue={scalar(input.to)} />
      </div>
      <div className={styles.filterField}>
        <label htmlFor="analytics-product">محصول</label>
        <select id="analytics-product" name="product" defaultValue={scalar(input.product)}>
          <option value="">همه محصولات</option>
          <option value="wellmate">WellMate</option>
          <option value="caremate">CareMate</option>
        </select>
      </div>
      <div className={styles.filterActions}>
        <button className={styles.primaryButton} type="submit">
          اعمال فیلتر
        </button>
        <a className={styles.secondaryButton} href="/analytics">
          پاک‌کردن
        </a>
      </div>
    </form>
  );
}

function Trend({ series }: { series: NonNullable<KpiValue["series"]> }) {
  if (series.length === 0) return <AdminPageState state="empty" title="روندی برای این بازه وجود ندارد" />;
  const max = Math.max(1, ...series.map((point) => point.value));
  const width = 720;
  const height = 180;
  const gap = 2;
  const barWidth = Math.max(1, width / series.length - gap);
  const total = series.reduce((sum, point) => sum + point.value, 0);
  const peak = series.reduce((current, point) => (point.value > current.value ? point : current));

  return (
    <div className={styles.trendWrap}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`روند روزانه ایجاد حساب؛ مجموع ${total.toLocaleString("fa-IR")}، بیشترین مقدار روزانه ${peak.value.toLocaleString("fa-IR")}`}
      >
        {series.map((point, index) => {
          const barHeight = (point.value / max) * (height - 20);
          return (
            <rect
              key={point.date}
              x={index * (barWidth + gap)}
              y={height - barHeight}
              width={barWidth}
              height={barHeight}
              rx="2"
            >
              <title>
                {point.date}: {point.value.toLocaleString("fa-IR")}
              </title>
            </rect>
          );
        })}
      </svg>
      <p className={styles.chartSummary}>
        مجموع بازه: <strong>{total.toLocaleString("fa-IR")}</strong> · بیشترین مقدار روزانه:{" "}
        <strong>{peak.value.toLocaleString("fa-IR")}</strong>
      </p>
    </div>
  );
}

function KpiCard({ definition, value }: { definition: AnalyticsKpiDefinition; value?: KpiValue }) {
  const unavailable = !value || value.state === "unavailable";
  return (
    <article className={styles.kpiCard} data-state={unavailable ? "unavailable" : "ready"}>
      <header className={styles.kpiHeader}>
        <div>
          <span className={styles.kpiName}>{definition.displayNameFa}</span>
          <small>v{definition.definitionVersion.toLocaleString("fa-IR")}</small>
        </div>
        <span className={styles.unitBadge}>{definition.unit === "rate" ? "نرخ" : "تعداد"}</span>
      </header>
      <strong className={styles.kpiValue}>{formatNumber(value?.value ?? null, definition.unit)}</strong>
      <p className={styles.formula}>{definition.formula}</p>
      <dl className={styles.metaList}>
        <div>
          <dt>بازه</dt>
          <dd>{definition.timeWindow}</dd>
        </div>
        <div>
          <dt>منبع</dt>
          <dd>{value?.source ?? definition.source.join(" + ")}</dd>
        </div>
        <div>
          <dt>تازگی</dt>
          <dd>
            {value?.freshness.status === "fresh"
              ? formatDateTime(value.freshness.asOfUtc)
              : "در دسترس نیست"}
          </dd>
        </div>
      </dl>
      {unavailable ? (
        <p className={styles.unavailableNote}>{value?.reason ?? "منبع معتبر این KPI هنوز instrument نشده است."}</p>
      ) : null}
    </article>
  );
}

async function DashboardContent({ input }: { input: Record<string, string | string[] | undefined> }) {
  const params = toApiParams(input);
  const [catalogResult, valuesResult] = await Promise.all([
    getAnalyticsCatalog(),
    getKpiValues(params),
  ]);

  if (catalogResult.kind === "unauthenticated" || valuesResult.kind === "unauthenticated") {
    redirect("/login");
  }
  if (catalogResult.kind === "forbidden" || valuesResult.kind === "forbidden") {
    return <AdminPageState state="forbidden" />;
  }
  if (valuesResult.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="بازه یا فیلتر معتبر نیست"
        description="بازه زمانی باید معتبر و حداکثر ۳۶۶ روز باشد."
      />
    );
  }
  if (catalogResult.kind !== "ok" || valuesResult.kind !== "ok") {
    return <AdminPageState state="unavailable" />;
  }

  const definitions = catalogResult.data.kpis;
  const values = new Map(valuesResult.data.values.map((value) => [value.name, value]));
  const accountTrend = values.get("accounts_created")?.series;
  const readyCount = valuesResult.data.values.filter((value) => value.state === "ready").length;

  return (
    <div className={styles.content}>
      <section className={styles.statusStrip} aria-label="وضعیت داده داشبورد">
        <div>
          <span>تعریف KPI</span>
          <strong>v{catalogResult.data.kpiDictionaryVersion.toLocaleString("fa-IR")}</strong>
        </div>
        <div>
          <span>KPI دارای منبع واقعی</span>
          <strong>
            {readyCount.toLocaleString("fa-IR")} از {definitions.length.toLocaleString("fa-IR")}
          </strong>
        </div>
        <div>
          <span>آخرین دریافت</span>
          <strong>{formatDateTime(valuesResult.data.generatedAtUtc)}</strong>
        </div>
      </section>

      <section className={styles.kpiGrid} aria-label="شاخص‌های کلیدی محصول">
        {definitions.map((definition) => (
          <KpiCard key={definition.name} definition={definition} value={values.get(definition.name)} />
        ))}
      </section>

      <section className={styles.trendCard}>
        <header>
          <div>
            <h3>روند ایجاد حساب</h3>
            <p>تنها روندی نمایش داده می‌شود که تاریخچه معتبر آن از منبع واقعی قابل محاسبه است.</p>
          </div>
        </header>
        {accountTrend ? (
          <Trend series={accountTrend} />
        ) : (
          <AdminPageState
            state="unavailable"
            title="روند این فیلتر در دسترس نیست"
            description="برای این ترکیب فیلتر، attribution معتبر تاریخی تعریف نشده است."
          />
        )}
      </section>
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const admin = await requireAdminAccess();
  const input = await searchParams;
  const canReadAnalytics = admin.permissions.includes("analytics.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="analytics"
        title="تحلیل محصول"
        subtitle="KPIهای نسخه‌دار با منبع و تازگی مشخص؛ بدون عدد ساختگی"
      >
        <div className={styles.page}>
          <AnalyticsFilters input={input} />
          {!canReadAnalytics ? (
            <AdminPageState state="forbidden" />
          ) : (
            <Suspense fallback={<AdminPageState state="loading" />}>
              <DashboardContent input={input} />
            </Suspense>
          )}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
