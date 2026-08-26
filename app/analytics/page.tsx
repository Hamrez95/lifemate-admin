import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getAnalyticsCatalog,
  type AnalyticsKpiDefinition,
} from "@/src/lib/admin-api/analytics-catalog";
import { getKpiValues, type KpiValue } from "@/src/lib/admin-api/analytics-kpis";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./analytics-reference.module.css";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const products = [
  { value: "", label: "کل اکوسیستم" },
  { value: "wellmate", label: "WellMate" },
  { value: "caremate", label: "CareMate" },
  { value: "women_health", label: "سلامت بانوان" },
] as const;
const number = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  month: "short",
  day: "numeric",
});
const dateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});

function one(value: string | string[] | undefined) {
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
function valueText(definition: AnalyticsKpiDefinition, value: KpiValue) {
  if (value.state === "unavailable" || value.value === null) return "—";
  return definition.unit === "rate"
    ? `${number.format(value.value * 100)}٪`
    : number.format(value.value);
}
function stateText(value: KpiValue) {
  return value.state === "ready" ? "معتبر" : value.state === "partial" ? "محدود" : "ناموجود";
}

function KpiCard({ definition, value }: { definition: AnalyticsKpiDefinition; value: KpiValue }) {
  return (
    <article className={styles.kpiCard} data-state={value.state}>
      <div className={styles.kpiTop}>
        <span>{stateText(value)}</span>
        <small>v{definition.definitionVersion.toLocaleString("fa-IR")}</small>
      </div>
      <p>{definition.displayNameFa}</p>
      <strong>{valueText(definition, value)}</strong>
      <small>
        {value.state === "unavailable" ? definition.eventSources.join(" + ") : value.source}
      </small>
      {value.reason ? <em>{value.reason}</em> : null}
    </article>
  );
}

function Trend({ value }: { value: KpiValue | undefined }) {
  const points = (value?.series ?? []).filter(
    (point): point is { date: string; value: number; suppressed?: boolean } =>
      point.value !== null && point.suppressed !== true,
  );
  if (!value || value.state === "unavailable" || points.length === 0) {
    return (
      <section className={styles.chartCard}>
        <header>
          <div>
            <span className={styles.eyebrow}>روند فعال‌سازی</span>
            <h3>حساب‌های ایجادشده</h3>
          </div>
        </header>
        <AdminPageState
          state="unavailable"
          title="سری زمانی canonical موجود نیست"
          description="نمودار ساختگی یا backfill نمایش داده نمی‌شود."
        />
      </section>
    );
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  const width = Math.max(560, points.length * 28);
  const total = points.reduce((sum, p) => sum + p.value, 0);
  return (
    <section className={styles.chartCard} aria-labelledby="analytics-trend-title">
      <header>
        <div>
          <span className={styles.eyebrow}>روند واقعی</span>
          <h3 id="analytics-trend-title">فعال‌سازی و جذب کاربران</h3>
          <p>سری روزانه از API canonical</p>
        </div>
        <b>{number.format(total)} حساب</b>
      </header>
      <div className={styles.chartScroll} tabIndex={0} aria-label="نمودار قابل پیمایش افقی">
        <svg
          className={styles.chart}
          viewBox={`0 0 ${width} 230`}
          role="img"
          aria-label={`روند ایجاد حساب؛ مجموع ${number.format(total)}`}
        >
          <line x1="30" x2={width - 18} y1="188" y2="188" className={styles.gridLine} />
          {points.map((point, index) => {
            const x = 36 + index * ((width - 72) / points.length);
            const h = Math.max(3, (point.value / max) * 142);
            const label = `${shortDate.format(new Date(`${point.date}T12:00:00Z`))}: ${number.format(point.value)} حساب`;
            return (
              <g
                key={point.date}
                className={styles.barGroup}
                tabIndex={0}
                role="img"
                aria-label={label}
              >
                <rect x={x} y={188 - h} width="14" height={h} rx="7" className={styles.bar}>
                  <title>{label}</title>
                </rect>
                <text x={x + 7} y="210" textAnchor="middle">
                  {index % Math.max(1, Math.ceil(points.length / 7)) === 0
                    ? shortDate.format(new Date(`${point.date}T12:00:00Z`))
                    : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className={styles.chartHint}>
        برای خواندن مقدار هر ستون، روی آن فوکوس کنید یا نشانگر را نگه دارید.
      </p>
    </section>
  );
}

async function Content({ filters }: { filters: URLSearchParams }) {
  const [catalogResult, valuesResult] = await Promise.all([
    getAnalyticsCatalog(),
    getKpiValues(filters),
  ]);
  if (catalogResult.kind === "unauthenticated" || valuesResult.kind === "unauthenticated")
    redirect("/login");
  if (catalogResult.kind === "forbidden" || valuesResult.kind === "forbidden")
    return <AdminPageState state="forbidden" />;
  if (valuesResult.kind === "invalid")
    return (
      <AdminPageState
        state="error"
        title="فیلتر Analytics معتبر نیست"
        description="بازه تاریخ یا محصول را بررسی کنید."
      />
    );
  if (catalogResult.kind !== "ok" || valuesResult.kind !== "ok") {
    const id =
      catalogResult.kind === "unavailable"
        ? catalogResult.correlationId
        : valuesResult.kind === "unavailable"
          ? valuesResult.correlationId
          : undefined;
    return (
      <AdminPageState
        state="unavailable"
        title="Analytics canonical در دسترس نیست"
        description={id ? `کد پیگیری: ${id}` : undefined}
      />
    );
  }
  const catalog = catalogResult.data;
  const values = valuesResult.data;
  const byName = new Map(values.values.map((v) => [v.name, v]));
  const cards = catalog.kpis.map((definition) => ({
    definition,
    value: byName.get(definition.name) ?? {
      name: definition.name,
      definitionVersion: definition.definitionVersion,
      state: "unavailable" as const,
      value: null,
      numerator: null,
      denominator: null,
      source: "catalog only",
      freshness: { status: "unavailable" as const, asOfUtc: values.generatedAtUtc },
      reason: "مقدار canonical برای این KPI دریافت نشد.",
    },
  }));
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Ecosystem Analytics · Reference 6</span>
          <h2>کاربران از کجا می‌آیند، فعال می‌شوند و می‌مانند؟</h2>
          <p>نمای اکوسیستم با KPIهای نسخه‌دار و داده واقعی. صفر با «ناموجود» یکی نیست.</p>
          <nav className={styles.heroLinks}>
            <Link href="/analytics/funnel">قیف فعال‌سازی</Link>
            <Link href="/analytics/cohorts">Cohorts و Retention</Link>
          </nav>
        </div>
        <aside>
          <strong>{catalog.kpiDictionaryVersion.toLocaleString("fa-IR")}</strong>
          <span>نسخه KPI</span>
          <strong>{catalog.eventTaxonomyVersion.toLocaleString("fa-IR")}</strong>
          <span>نسخه Taxonomy</span>
        </aside>
      </section>

      <section className={styles.toolbar} aria-label="فیلترها و عملیات Analytics">
        <form method="get" className={styles.filters}>
          <label>
            <span>از تاریخ</span>
            <input type="date" name="from" defaultValue={values.query.from} />
          </label>
          <label>
            <span>تا تاریخ</span>
            <input type="date" name="to" defaultValue={values.query.to} />
          </label>
          <label>
            <span>حوزه تحلیل</span>
            <select name="product" defaultValue={values.query.product ?? ""}>
              {products.map((p) => (
                <option key={p.value || "all"} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">اعمال فیلتر</button>
        </form>
        <div className={styles.actions}>
          <button
            type="button"
            disabled
            title="endpoint canonical برای export analytics وجود ندارد"
          >
            خروجی
          </button>
          <button
            type="button"
            disabled
            title="endpoint canonical برای drill-down analytics وجود ندارد"
          >
            Drill-down
          </button>
        </div>
      </section>

      <section className={styles.kpiSection}>
        <header>
          <div>
            <span className={styles.eyebrow}>خلاصه شاخص‌های کلیدی</span>
            <h3>سلامت و رشد محصول</h3>
          </div>
          <small>آخرین دریافت: {dateTime.format(new Date(values.generatedAtUtc))}</small>
        </header>
        <div className={styles.kpiGrid}>
          {cards.map(({ definition, value }) => (
            <KpiCard key={definition.name} definition={definition} value={value} />
          ))}
        </div>
      </section>
      <Trend value={byName.get("accounts_created")} />
      <section className={styles.boundary}>
        <strong>مرز داده</strong>
        <p>
          فیلتر تاریخ فعال است چون endpoint `/api/v1/analytics/kpis` آن را پشتیبانی می‌کند. Export و
          Drill-down تا زمان وجود endpoint واقعی غیرفعال هستند.
        </p>
      </section>
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("analytics.read");
  const filters = buildFilters(await searchParams);
  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="analytics"
        title="تحلیل اکوسیستم و محصول"
        subtitle="Reference 6 · canonical data only"
      >
        {!canRead ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense
            fallback={<AdminPageState state="loading" title="در حال دریافت Analytics canonical" />}
          >
            <Content filters={filters} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
