import Link from "next/link";
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

import styles from "./funnel.module.css";

type FunnelPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const products = [
  { value: "", label: "همه محصولات" },
  { value: "wellmate", label: "WellMate" },
  { value: "caremate", label: "CareMate" },
  { value: "women_health", label: "Women Health" },
] as const;

const number = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function paramsFrom(input: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ["from", "to", "product"] as const) {
    const value = one(input[key]).trim();
    if (value) params.set(key, value);
  }
  return params;
}

function formatValue(definition: AnalyticsKpiDefinition, value: KpiValue): string {
  if (value.state === "unavailable" || value.value === null) return "—";
  return definition.unit === "rate"
    ? `${number.format(value.value * 100)}٪`
    : number.format(value.value);
}

function CanonicalMetric({
  definition,
  value,
}: {
  definition: AnalyticsKpiDefinition;
  value: KpiValue;
}) {
  const normalized =
    value.value === null ? 0 : definition.unit === "rate" ? value.value * 100 : value.value;
  const width =
    definition.unit === "rate"
      ? Math.max(0, Math.min(normalized, 100))
      : value.value === null
        ? 0
        : 100;
  const label = `${definition.displayNameFa}: ${formatValue(definition, value)}؛ وضعیت ${value.state}`;

  return (
    <article className={styles.metricRow} data-state={value.state}>
      <div className={styles.metricHeader}>
        <div>
          <strong>{definition.displayNameFa}</strong>
          <span>{definition.eventSources.join(" · ")}</span>
        </div>
        <b>{formatValue(definition, value)}</b>
      </div>
      {value.state === "unavailable" ? (
        <div className={styles.metricUnavailable} role="status">
          {value.reason ?? "این شاخص از API canonical مقدار قابل اتکا ندارد."}
        </div>
      ) : (
        <div className={styles.barTrack} role="img" aria-label={label} tabIndex={0}>
          <span className={styles.barFill} style={{ width: `${width}%` }} aria-hidden="true" />
          <span className={styles.tooltip} role="tooltip">
            {label}
          </span>
        </div>
      )}
      <small>{definition.formula}</small>
    </article>
  );
}

async function FunnelContent({ filters }: { filters: URLSearchParams }) {
  const [catalogResult, valuesResult] = await Promise.all([
    getAnalyticsCatalog(),
    getKpiValues(filters),
  ]);

  if (catalogResult.kind === "unauthenticated" || valuesResult.kind === "unauthenticated")
    redirect("/login");
  if (catalogResult.kind === "forbidden" || valuesResult.kind === "forbidden") {
    return <AdminPageState state="forbidden" title="مجوز مشاهده تحلیل قیف وجود ندارد" />;
  }
  if (valuesResult.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="فیلتر قیف معتبر نیست"
        description="فیلتر تاریخ یا محصول را بررسی کنید."
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
        title="داده canonical قیف در دسترس نیست"
        description={correlationId ? `کد پیگیری: ${correlationId}` : undefined}
      />
    );
  }

  const catalog = catalogResult.data;
  const values = valuesResult.data;
  const byName = new Map(values.values.map((item) => [item.name, item]));
  const measurable = catalog.kpis
    .map((definition) => ({ definition, value: byName.get(definition.name) }))
    .filter((item): item is { definition: AnalyticsKpiDefinition; value: KpiValue } =>
      Boolean(item.value),
    );

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Activation Funnel · Canonical evidence</span>
          <h2>قیف فعال‌سازی و تبدیل</h2>
          <p>
            این صفحه با الگوی مرجع ۹ طراحی شده، اما فقط داده‌ای را به‌عنوان «قیف» نشان می‌دهد که از
            قرارداد canonical قابل اثبات باشد. KPIهای مستقل به‌جای تبدیل مرحله‌به‌مرحله جعل
            نمی‌شوند.
          </p>
        </div>
        <div className={styles.heroMeta}>
          <span>Taxonomy v{catalog.eventTaxonomyVersion.toLocaleString("fa-IR")}</span>
          <span>KPI Dictionary v{catalog.kpiDictionaryVersion.toLocaleString("fa-IR")}</span>
          <span>آخرین دریافت {dateTime.format(new Date(values.generatedAtUtc))}</span>
        </div>
      </section>

      <section className={styles.toolbar} aria-label="کنترل‌های تحلیل قیف">
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
            <span>محصول</span>
            <select name="product" defaultValue={values.query.product ?? ""}>
              {products.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">اعمال فیلتر</button>
        </form>
        <div className={styles.actions}>
          <button type="button" disabled title="endpoint canonical برای export قیف وجود ندارد">
            خروجی
          </button>
          <button type="button" disabled title="endpoint canonical برای drill-down قیف وجود ندارد">
            Drill-down
          </button>
        </div>
      </section>

      <section className={styles.funnelCard} aria-labelledby="canonical-funnel-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Truthful funnel state</span>
            <h3 id="canonical-funnel-title">نمای قیف مرحله‌ای</h3>
          </div>
          <span className={styles.unavailableBadge}>Unavailable</span>
        </div>
        <AdminPageState
          state="unavailable"
          title="endpoint اختصاصی funnel هنوز در Core وجود ندارد"
          description="تا وقتی شمارش ترتیبی مراحل و conversion بین مراحل از API canonical نیاید، شکل funnel یا نرخ ریزش مرحله‌ای ساخته نمی‌شود."
        />
      </section>

      <section className={styles.metricsCard} aria-labelledby="canonical-evidence-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Canonical KPI evidence</span>
            <h3 id="canonical-evidence-title">شاخص‌های واقعی مرتبط با فعال‌سازی</h3>
            <p>این نوارها KPIهای مستقل هستند، نه conversion بین مراحل.</p>
          </div>
        </div>
        <div className={styles.metricList}>
          {measurable.length === 0 ? (
            <AdminPageState state="empty" title="KPI قابل نمایش وجود ندارد" />
          ) : (
            measurable.map(({ definition, value }) => (
              <CanonicalMetric key={definition.name} definition={definition} value={value} />
            ))
          )}
        </div>
      </section>

      <div className={styles.bottomLinks}>
        <Link href="/analytics">نمای کلی Analytics</Link>
        <Link href="/analytics/cohorts">Cohorts و Retention</Link>
      </div>
    </div>
  );
}

export default async function FunnelPage({ searchParams }: FunnelPageProps) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("analytics.read");
  const filters = paramsFrom(await searchParams);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="analytics"
        title="قیف فعال‌سازی و تبدیل"
        subtitle="Reference 9 · canonical data only"
      >
        {!canRead ? <AdminPageState state="forbidden" /> : <FunnelContent filters={filters} />}
      </AdminShell>
    </AdminSessionProvider>
  );
}
