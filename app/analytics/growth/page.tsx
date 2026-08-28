import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getGrowthAnalytics,
  type GrowthMetric,
  type GrowthMetricState,
  type GrowthStage,
  type GrowthWindow,
} from "@/src/lib/admin-api/growth-analytics";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./growth.module.css";

type GrowthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const windows: Array<{ value: GrowthWindow; label: string }> = [
  { value: "daily", label: "روزانه" },
  { value: "weekly", label: "هفتگی" },
  { value: "monthly", label: "ماهانه" },
  { value: "quarterly", label: "فصلی" },
  { value: "yearly", label: "سالانه" },
];

const products = [
  { value: "", label: "همه محصولات" },
  { value: "wellmate", label: "WellMate" },
  { value: "caremate", label: "CareMate" },
  { value: "women_health", label: "Women Health" },
] as const;

const stageMeta: Record<GrowthStage, { label: string; description: string }> = {
  acquisition: { label: "Acquisition", description: "ورود حساب‌های جدید با attribution فقط در صورت وجود fact canonical." },
  activation: { label: "Activation", description: "ثبت‌نام محصول و activation مشاهده‌شده از enrollmentهای canonical." },
  engagement: { label: "Engagement", description: "شاخص‌های استفاده فقط وقتی event history معتبر وجود داشته باشد." },
  monetization: { label: "Monetization", description: "درآمد، تبدیل پولی، LTV و CAC بدون inference یا FX ضمنی." },
  retention: { label: "Retention", description: "renewal/churn فقط با denominator و cohort history معتبر." },
};

const stateLabel: Record<GrowthMetricState, string> = {
  ready: "Ready",
  partial: "Partial",
  unavailable: "Unavailable",
};

const number = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 86_400_000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function paramsFrom(input: Record<string, string | string[] | undefined>): URLSearchParams {
  const defaults = defaultRange();
  const params = new URLSearchParams();
  params.set("from", one(input.from).trim() || defaults.from);
  params.set("to", one(input.to).trim() || defaults.to);
  params.set("window", one(input.window).trim() || "monthly");
  const product = one(input.product).trim();
  if (product) params.set("product", product);
  return params;
}

function displayValue(metric: GrowthMetric): string {
  if (metric.state === "unavailable" || metric.value === null) return "—";
  if (metric.unit === "rate" && typeof metric.value === "number") return `${number.format(metric.value * 100)}٪`;
  if (metric.unit === "minor_currency") {
    return typeof metric.value === "string" ? metric.value : number.format(metric.value);
  }
  return typeof metric.value === "number" ? number.format(metric.value) : metric.value;
}

function compareValue(current: GrowthMetric, previous: GrowthMetric | undefined): string {
  if (
    !previous ||
    current.state === "unavailable" ||
    previous.state === "unavailable" ||
    typeof current.value !== "number" ||
    typeof previous.value !== "number"
  ) {
    return "مقایسه در دسترس نیست";
  }
  if (previous.value === 0) return current.value === 0 ? "بدون تغییر" : "دوره قبل صفر بوده";
  const change = ((current.value - previous.value) / Math.abs(previous.value)) * 100;
  const sign = change > 0 ? "+" : "";
  return `${sign}${number.format(change)}٪ نسبت به دوره قبل`;
}

function MetricCard({ metric, previous }: { metric: GrowthMetric; previous?: GrowthMetric }) {
  return (
    <article className={styles.metricCard} data-state={metric.state}>
      <div className={styles.metricHeader}>
        <div>
          <span className={styles.metricKey}>{metric.key}</span>
          <strong>{displayValue(metric)}</strong>
        </div>
        <span className={styles.stateBadge} data-state={metric.state}>
          {stateLabel[metric.state]}
        </span>
      </div>
      <p>{metric.reason ?? metric.source}</p>
      <div className={styles.metricMeta}>
        <span>تعریف v{metric.definitionVersion.toLocaleString("fa-IR")}</span>
        <span>{compareValue(metric, previous)}</span>
      </div>
      <small>Source: {metric.source}</small>
    </article>
  );
}

async function GrowthContent({ filters }: { filters: URLSearchParams }) {
  const result = await getGrowthAnalytics(filters);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") {
    return <AdminPageState state="forbidden" title="مجوز مشاهده Growth Analytics وجود ندارد" />;
  }
  if (result.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="فیلتر Growth Analytics معتبر نیست"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }
  if (result.kind !== "ok") {
    return (
      <AdminPageState
        state="unavailable"
        title="Growth Analytics canonical در دسترس نیست"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }

  const data = result.data;
  const previousByKey = new Map(data.previous.metrics.map((metric) => [metric.key, metric]));
  const grouped = Object.keys(stageMeta).map((stage) => ({
    stage: stage as GrowthStage,
    metrics: data.current.filter((metric) => metric.stage === stage),
  }));

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Founder Growth Analytics · canonical facts only</span>
          <h2>Acquisition → Activation → Engagement → Monetization → Retention</h2>
          <p>
            این cockpit فقط factهای canonical Core را نمایش می‌دهد. KPIهای فاقد source معتبر به‌صورت
            Unavailable باقی می‌مانند و LTV، CAC، Revenue یا Churn از داده‌های ناقص استنتاج نمی‌شوند.
          </p>
        </div>
        <div className={styles.heroMeta}>
          <span>Contract v{data.definitionVersion.toLocaleString("fa-IR")}</span>
          <span>Timezone: {data.freshness.timezone}</span>
          <span>{dateTime.format(new Date(data.freshness.asOfUtc))}</span>
        </div>
      </section>

      <section className={styles.toolbar} aria-label="فیلترهای Founder Growth Analytics">
        <form method="get" className={styles.filters}>
          <label>
            <span>از تاریخ</span>
            <input type="date" name="from" defaultValue={data.query.from} />
          </label>
          <label>
            <span>تا تاریخ</span>
            <input type="date" name="to" defaultValue={data.query.to} />
          </label>
          <label>
            <span>بازه</span>
            <select name="window" defaultValue={data.query.window}>
              {windows.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>محصول</span>
            <select name="product" defaultValue={data.query.product ?? ""}>
              {products.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">اعمال فیلتر</button>
        </form>
        <button type="button" disabled title="Core هنوز aggregate export contract برای Growth Analytics ارائه نمی‌کند">
          خروجی
        </button>
      </section>

      <section className={styles.scopeNotice}>
        <strong>مرز scope داده</strong>
        <span>Account-scoped: {data.policy.accountScoped.join(" · ") || "—"}</span>
        <span>Person-scoped: {data.policy.personScoped.join(" · ") || "—"}</span>
        <span>No fabrication: {data.policy.noFabrication ? "enforced" : "invalid"}</span>
      </section>

      {grouped.map(({ stage, metrics }) => (
        <section className={styles.stageSection} key={stage} aria-labelledby={`stage-${stage}`}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Growth stage</span>
              <h3 id={`stage-${stage}`}>{stageMeta[stage].label}</h3>
              <p>{stageMeta[stage].description}</p>
            </div>
            <span>{metrics.length.toLocaleString("fa-IR")} شاخص</span>
          </div>
          {metrics.length === 0 ? (
            <AdminPageState state="empty" title="شاخص canonical برای این مرحله وجود ندارد" />
          ) : (
            <div className={styles.metricGrid}>
              {metrics.map((metric) => (
                <MetricCard key={metric.key} metric={metric} previous={previousByKey.get(metric.key)} />
              ))}
            </div>
          )}
        </section>
      ))}

      <section className={styles.previousPeriod}>
        <strong>دوره مقایسه</strong>
        <span>
          {data.previous.range.from} تا {data.previous.range.to}
        </span>
        <span>مقایسه فقط زمانی نمایش داده می‌شود که هر دو fact عددی و قابل اتکا باشند.</span>
      </section>

      <div className={styles.links}>
        <Link href="/analytics">Analytics Overview</Link>
        <Link href="/analytics/funnel">Activation Funnel</Link>
        <Link href="/analytics/cohorts">Cohorts & Retention</Link>
      </div>
    </div>
  );
}

export default async function FounderGrowthPage({ searchParams }: GrowthPageProps) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("analytics.read");
  const filters = paramsFrom(await searchParams);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="analytics"
        title="Founder Growth Analytics"
        subtitle="Trusted growth facts · no inferred KPI"
      >
        {!canRead ? <AdminPageState state="forbidden" /> : <GrowthContent filters={filters} />}
      </AdminShell>
    </AdminSessionProvider>
  );
}
