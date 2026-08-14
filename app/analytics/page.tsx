import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getAnalyticsCatalog,
  type AnalyticsKpiDefinition,
} from "@/src/lib/admin-api/analytics-catalog";
import { getKpiValues, type KpiValue } from "@/src/lib/admin-api/analytics-kpis";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./analytics.module.css";

type AnalyticsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const productOptions = [
  { value: "", label: "همه محصولات" },
  { value: "wellmate", label: "WellMate" },
  { value: "caremate", label: "CareMate" },
  { value: "women_health", label: "Women Health" },
] as const;

const valueFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  month: "short",
  day: "numeric",
});

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function buildFilters(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const key of ["from", "to", "product"] as const) {
    const value = one(input[key]).trim();
    if (value) params.set(key, value);
  }
  return params;
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function formatValue(definition: AnalyticsKpiDefinition, value: KpiValue): string {
  if (value.state === "unavailable" || value.value === null) return "—";
  if (definition.unit === "rate") return `${valueFormatter.format(value.value * 100)}٪`;
  return valueFormatter.format(value.value);
}

function freshnessLabel(value: KpiValue): string {
  if (value.state === "ready") return "داده معتبر";
  if (value.state === "partial") return "داده محدود اما واقعی";
  return "هنوز اندازه‌گیری نشده";
}

function KpiCard({
  definition,
  value,
}: {
  definition: AnalyticsKpiDefinition;
  value: KpiValue;
}) {
  return (
    <article className={styles.kpiCard} data-state={value.state}>
      <div className={styles.kpiTopline}>
        <span className={styles.versionBadge}>
          v{definition.definitionVersion.toLocaleString("fa-IR")}
        </span>
        <span className={styles.stateBadge} data-state={value.state}>
          {freshnessLabel(value)}
        </span>
      </div>
      <div>
        <p className={styles.kpiLabel}>{definition.displayNameFa}</p>
        <strong className={styles.kpiValue}>{formatValue(definition, value)}</strong>
      </div>
      <dl className={styles.kpiMeta}>
        <div>
          <dt>منبع</dt>
          <dd>
            {value.state === "unavailable" ? definition.eventSources.join(" + ") : value.source}
          </dd>
        </div>
        <div>
          <dt>پنجره</dt>
          <dd>{definition.timeWindow}</dd>
        </div>
      </dl>
      {value.reason ? <p className={styles.reason}>{value.reason}</p> : null}
      <details className={styles.definitionDetails}>
        <summary>تعریف KPI</summary>
        <div className={styles.definitionBody}>
          <p>
            <b>فرمول:</b> <code>{definition.formula}</code>
          </p>
          <p>
            <b>صورت:</b> {definition.numerator}
          </p>
          <p>
            <b>مخرج:</b> {definition.denominator ?? "—"}
          </p>
          <p>
            <b>تازگی:</b> {definition.freshnessRule}
          </p>
        </div>
      </details>
    </article>
  );
}

function AccountsTrend({ value }: { value: KpiValue | undefined }) {
  const points = value?.series ?? [];
  if (!value || value.state === "unavailable" || points.length === 0) {
    return (
      <section className={styles.chartCard}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>روند</span>
            <h3>حساب‌های ایجادشده</h3>
          </div>
        </div>
        <AdminPageState
          state="empty"
          title="روند قابل اتکایی برای این فیلتر نداریم"
          description="در نبود تاریخچه معتبر، نمودار ساختگی نمایش داده نمی‌شود."
        />
      </section>
    );
  }

  const maximum = Math.max(...points.map((point) => point.value), 1);
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const width = Math.max(points.length * 22, 520);
  const barWidth = Math.max(8, Math.min(14, (width - 56) / points.length - 4));

  return (
    <section className={styles.chartCard} aria-labelledby="accounts-trend-title">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>روند واقعی</span>
          <h3 id="accounts-trend-title">حساب‌های ایجادشده</h3>
          <p>نمای روزانه بر اساس created_at حساب‌ها؛ بدون backfill ساختگی.</p>
        </div>
        <span className={styles.trendTotal}>{valueFormatter.format(total)} حساب</span>
      </div>
      <div className={styles.chartScroller}>
        <svg
          className={styles.chart}
          role="img"
          aria-label={`روند روزانه ایجاد حساب در بازه انتخاب‌شده؛ مجموع ${valueFormatter.format(total)} حساب`}
          viewBox={`0 0 ${width} 210`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="lmKpiBars" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--lm-green)" />
              <stop offset="100%" stopColor="var(--lm-blue)" />
            </linearGradient>
          </defs>
          <line className={styles.chartGrid} x1="24" x2={width - 18} y1="174" y2="174" />
          {points.map((point, index) => {
            const barHeight = (point.value / maximum) * 132;
            const x = 28 + index * ((width - 56) / points.length);
            return (
              <g key={point.date}>
                <rect
                  className={styles.chartBar}
                  x={x}
                  y={174 - barHeight}
                  width={barWidth}
                  height={Math.max(barHeight, point.value > 0 ? 3 : 0)}
                  rx="5"
                >
                  <title>
                    {shortDateFormatter.format(new Date(`${point.date}T12:00:00Z`))}:{" "}
                    {valueFormatter.format(point.value)}
                  </title>
                </rect>
              </g>
            );
          })}
        </svg>
      </div>
      <p className={styles.chartSummary}>
        بیشترین مقدار روزانه {valueFormatter.format(maximum)} حساب است. وضعیت منبع:{" "}
        {freshnessLabel(value)}.
      </p>
    </section>
  );
}

async function AnalyticsContent({ filters }: { filters: URLSearchParams }) {
  const [catalogResult, valuesResult] = await Promise.all([
    getAnalyticsCatalog(),
    getKpiValues(filters),
  ]);

  if (catalogResult.kind === "unauthenticated" || valuesResult.kind === "unauthenticated")
    redirect("/login");
  if (catalogResult.kind === "forbidden" || valuesResult.kind === "forbidden") {
    return <AdminPageState state="forbidden" />;
  }
  if (valuesResult.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="فیلتر انتخاب‌شده معتبر نیست"
        description="بازه زمانی باید حداکثر ۳۶۶ روز باشد و محصول از فهرست مجاز انتخاب شود."
      />
    );
  }
  if (catalogResult.kind !== "ok" || valuesResult.kind !== "ok") {
    const correlationId =
      catalogResult.kind === "unavailable"
        ? catalogResult.correlationId
        : valuesResult.kind === "unavailable"
          ? valuesResult.correlationId
          : undefined;
    return (
      <AdminPageState
        state="unavailable"
        description={correlationId ? `کد پیگیری: ${correlationId}` : undefined}
      />
    );
  }

  const catalog = catalogResult.data;
  const values = valuesResult.data;
  const byName = new Map(values.values.map((value) => [value.name, value]));
  const readyCount = values.values.filter((value) => value.state === "ready").length;
  const partialCount = values.values.filter((value) => value.state === "partial").length;
  const unavailableCount = values.values.filter((value) => value.state === "unavailable").length;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>Product Intelligence · LifeMate</span>
          <h2>داشبورد KPI محصول</h2>
          <p>
            هر عددی که می‌بینی به تعریف نسخه‌دار و منبع مشخص وصل است. هر چیزی که هنوز قابل
            اندازه‌گیری نیست، عمداً «—» می‌ماند.
          </p>
        </div>
        <div className={styles.heroStatus}>
          <div>
            <strong>{catalog.kpiDictionaryVersion.toLocaleString("fa-IR")}</strong>
            <span>نسخه دیکشنری</span>
          </div>
          <div>
            <strong>{(readyCount + partialCount).toLocaleString("fa-IR")}</strong>
            <span>منبع قابل نمایش</span>
          </div>
          <div>
            <strong>{unavailableCount.toLocaleString("fa-IR")}</strong>
            <span>در انتظار instrumentation</span>
          </div>
        </div>
      </section>

      <section className={styles.filterCard} aria-labelledby="analytics-filters-title">
        <div className={styles.filterIntro}>
          <span className={styles.eyebrow}>فیلتر امن</span>
          <h3 id="analytics-filters-title">بازه و محصول</h3>
          <p>بازه‌ها در Asia/Tehran محاسبه می‌شوند و به ۳۶۶ روز محدود هستند.</p>
        </div>
        <form className={styles.filters} method="get">
          <label>
            <span>از تاریخ</span>
            <input type="date" name="from" defaultValue={values.query.from} />
          </label>
          <label>
            <span>تا تاریخ</span>
            <input type="date" name="to" defaultValue={values.query.to} />
          </label>
          <label>
            <span>محصول</span>
            <select name="product" defaultValue={values.query.product ?? ""}>
              {productOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">اعمال فیلتر</button>
        </form>
      </section>

      <div className={styles.contextStrip}>
        <span>تعریف‌ها: v{catalog.kpiDictionaryVersion.toLocaleString("fa-IR")}</span>
        <span>Taxonomy: v{catalog.eventTaxonomyVersion.toLocaleString("fa-IR")}</span>
        <span>آخرین دریافت: {formatGeneratedAt(values.generatedAtUtc)}</span>
      </div>

      <section className={styles.kpiSection} aria-labelledby="product-kpis-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>شاخص‌های canonical</span>
            <h3 id="product-kpis-title">سلامت و رشد محصول</h3>
            <p>داده ناقص از unavailable جداست تا تصمیم‌گیری روی صفر ساختگی انجام نشود.</p>
          </div>
        </div>
        <div className={styles.kpiGrid}>
          {catalog.kpis.map((definition) => {
            const value = byName.get(definition.name) ?? {
              name: definition.name,
              definitionVersion: definition.definitionVersion,
              state: "unavailable" as const,
              value: null,
              numerator: null,
              denominator: null,
              source: "catalog only",
              freshness: {
                status: "unavailable" as const,
                asOfUtc: values.generatedAtUtc,
              },
              reason: "برای این KPI مقدار معتبری از API دریافت نشد.",
            };
            return <KpiCard key={definition.name} definition={definition} value={value} />;
          })}
        </div>
      </section>

      <AccountsTrend value={byName.get("accounts_created")} />
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const admin = await requireAdminAccess();
  const filters = buildFilters(await searchParams);
  const canReadAnalytics = admin.permissions.includes("analytics.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="analytics"
        title="تحلیل محصول"
        subtitle="KPIهای نسخه‌دار، منبع‌دار و بدون عدد ساختگی"
      >
        {!canReadAnalytics ? (
          <AdminPageState state="forbidden" />
        ) : (
          <AnalyticsContent filters={filters} />
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
