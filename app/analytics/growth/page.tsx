import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getGrowthAnalytics,
  type GrowthMetric,
  type GrowthMetricAvailability,
  type GrowthStage,
  type GrowthWindow,
} from "@/src/lib/admin-api/growth-analytics";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./growth.module.css";

type GrowthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type MetricCopy = {
  label: string;
  technical: string;
  what: string;
  why: string;
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
  acquisition: {
    label: "جذب کاربر",
    description: "چند حساب جدید وارد LifeMate شده‌اند و آیا منبع جذب معتبر داریم؟",
  },
  activation: {
    label: "شروع استفاده",
    description: "چند کاربر بعد از ورود واقعاً استفاده از محصول را شروع کرده‌اند؟",
  },
  engagement: {
    label: "استفاده و بازگشت",
    description: "چند حساب واقعاً از LifeMate استفاده می‌کنند و چند نفر دوباره برمی‌گردند؟",
  },
  monetization: {
    label: "درآمد",
    description: "تبدیل به مشتری پولی و اقتصاد رشد، فقط از داده‌های قابل اتکا.",
  },
  retention: {
    label: "ماندگاری",
    description: "تمدید و ریزش فقط وقتی cohort و denominator معتبر وجود داشته باشد.",
  },
};

const availabilityLabel: Record<GrowthMetricAvailability, string> = {
  ready: "داده آماده است",
  partial: "بخشی از داده آماده است",
  not_enough_data: "هنوز داده کافی نداریم",
  not_instrumented: "این اندازه‌گیری هنوز فعال نشده",
  delayed: "داده با تأخیر دریافت می‌شود",
  unavailable: "فعلاً امکان دریافت این اطلاعات نیست",
};

const metricCopy: Record<string, MetricCopy> = {
  accounts_created: {
    label: "حساب‌های جدید",
    technical: "New accounts",
    what: "تعداد حساب‌هایی که در بازه انتخابی ساخته شده‌اند.",
    why: "ساده‌ترین نشانه برای دیدن سرعت ورود کاربران جدید به LifeMate است.",
  },
  enrolled_accounts: {
    label: "کاربران واردشده به محصول",
    technical: "Enrolled accounts",
    what: "تعداد حساب‌های یکتایی که در بازه انتخابی به محصول وارد شده‌اند.",
    why: "کمک می‌کند بفهمیم ثبت حساب تا ورود واقعی به محصول چقدر تبدیل می‌شود.",
  },
  activation_observed_rate: {
    label: "نرخ شروع استفاده",
    technical: "Observed activation rate",
    what: "سهم کاربران واردشده‌ای که حداقل یک نشانه معتبر از شروع استفاده داشته‌اند.",
    why: "نشان می‌دهد onboarding تا چه حد کاربر را به اولین استفاده واقعی می‌رساند.",
  },
  dau: {
    label: "کاربران فعال امروز",
    technical: "DAU",
    what: "تعداد حساب‌هایی که در روز انتخابی حداقل یک app_opened موفق و canonical داشته‌اند.",
    why: "نشان می‌دهد در یک روز چند کاربر واقعاً به LifeMate برگشته و از آن استفاده کرده‌اند.",
  },
  wau: {
    label: "کاربران فعال ۷ روز اخیر",
    technical: "WAU",
    what: "تعداد حساب‌های یکتا با حداقل یک استفاده canonical در ۷ روز منتهی به تاریخ انتخابی.",
    why: "برای دیدن استفاده هفتگی و کاهش حساسیت به نوسان یک روز مناسب است.",
  },
  mau: {
    label: "کاربران فعال ۳۰ روز اخیر",
    technical: "MAU",
    what: "تعداد حساب‌های یکتا با حداقل یک استفاده canonical در ۳۰ روز منتهی به تاریخ انتخابی.",
    why: "اندازه پایه جامعه کاربران فعال ماهانه و denominator اصلی stickiness است.",
  },
  new_dau: {
    label: "کاربران فعال جدید امروز",
    technical: "New DAU",
    what: "کاربران فعال امروز که حسابشان نیز در همان روز ایجاد شده است.",
    why: "کمک می‌کند رشد روزانه را از بازگشت کاربران قدیمی جدا کنیم.",
  },
  returning_dau: {
    label: "کاربران بازگشتی امروز",
    technical: "Returning DAU",
    what: "کاربران فعال امروز که حسابشان قبل از روز انتخابی وجود داشته است.",
    why: "نشانه ساده‌ای از بازگشت و شکل‌گیری عادت استفاده است.",
  },
  dau_mau_stickiness: {
    label: "چند درصد کاربران ماهانه امروز هم برگشته‌اند؟",
    technical: "DAU / MAU",
    what: "نسبت کاربران فعال روزانه به کاربران فعال ۳۰ روزه با scope و تاریخ پایان یکسان.",
    why: "هرچه بالاتر باشد، سهم بیشتری از کاربران ماهانه در یک روز معمولی برمی‌گردند.",
  },
  wau_mau_stickiness: {
    label: "چند درصد کاربران ماهانه این هفته فعال بوده‌اند؟",
    technical: "WAU / MAU",
    what: "نسبت کاربران فعال ۷ روزه به کاربران فعال ۳۰ روزه با scope و تاریخ پایان یکسان.",
    why: "برای فهم تکرار استفاده در طول هفته بدون تکیه به یک روز خاص مفید است.",
  },
  paid_conversion: {
    label: "تبدیل به مشتری پولی",
    technical: "Paid conversion",
    what: "سهم cohort واجدشرایط که به پرداخت موفق رسیده است.",
    why: "نشان می‌دهد رشد کاربر تا چه اندازه به درآمد واقعی تبدیل می‌شود.",
  },
  ltv: {
    label: "ارزش طول عمر مشتری",
    technical: "LTV",
    what: "ارزش درآمدی یک مشتری در طول رابطه با LifeMate، فقط وقتی cohort revenue معتبر باشد.",
    why: "برای تصمیم‌گیری درباره هزینه جذب و مدل اقتصادی رشد ضروری است.",
  },
  cac: {
    label: "هزینه جذب مشتری",
    technical: "CAC",
    what: "هزینه قابل انتساب برای جذب هر مشتری، فقط از spend attribution معتبر.",
    why: "در کنار LTV نشان می‌دهد رشد پولی از نظر اقتصادی منطقی است یا نه.",
  },
  renewal_rate: {
    label: "نرخ تمدید",
    technical: "Renewal rate",
    what: "سهم اشتراک‌های واجدشرایط که واقعاً تمدید شده‌اند.",
    why: "یکی از مهم‌ترین نشانه‌های رضایت و ماندگاری مشتری پولی است.",
  },
  churn_rate: {
    label: "نرخ ریزش",
    technical: "Churn rate",
    what: "سهم cohort واجدشرایط که اشتراک فعال خود را از دست داده است.",
    why: "برای تشخیص نشت رشد و پیش‌بینی درآمد آینده حیاتی است.",
  },
};

const number = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 });
const relative = new Intl.RelativeTimeFormat("fa-IR", { numeric: "auto" });

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

function availability(metric: GrowthMetric): GrowthMetricAvailability {
  return metric.availability ?? metric.state;
}

function isComparable(metric: GrowthMetric | undefined): boolean {
  return Boolean(metric && metric.state === "ready" && availability(metric) === "ready");
}

function displayValue(metric: GrowthMetric): string {
  if (!isComparable(metric) && metric.state !== "partial") return "—";
  if (metric.value === null) return "—";
  if (metric.unit === "rate" && typeof metric.value === "number") {
    return `${number.format(metric.value * 100)}٪`;
  }
  if (metric.unit === "minor_currency") {
    return typeof metric.value === "string" ? metric.value : number.format(metric.value);
  }
  return typeof metric.value === "number" ? number.format(metric.value) : metric.value;
}

function compareValue(current: GrowthMetric, previous: GrowthMetric | undefined): string {
  if (
    !isComparable(current) ||
    !isComparable(previous) ||
    typeof current.value !== "number" ||
    typeof previous?.value !== "number"
  ) {
    return "برای مقایسه هنوز داده کامل نداریم";
  }
  if (previous.value === 0) return current.value === 0 ? "بدون تغییر" : "دوره قبل صفر بوده";
  const change = ((current.value - previous.value) / Math.abs(previous.value)) * 100;
  const sign = change > 0 ? "+" : "";
  return `${sign}${number.format(change)}٪ نسبت به دوره قبل`;
}

function freshnessLabel(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "زمان به‌روزرسانی نامشخص";
  const minutes = Math.round((timestamp - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return `به‌روزرسانی ${relative.format(minutes, "minute")}`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return `به‌روزرسانی ${relative.format(hours, "hour")}`;
  const days = Math.round(hours / 24);
  return `به‌روزرسانی ${relative.format(days, "day")}`;
}

function formatSnapshot(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function copyFor(metric: GrowthMetric): MetricCopy {
  return (
    metricCopy[metric.key] ?? {
      label: metric.key,
      technical: metric.key,
      what: metric.reason ?? "تعریف این شاخص از قرارداد canonical Core دریافت می‌شود.",
      why: "این شاخص فقط وقتی نمایش داده می‌شود که منبع معتبر داشته باشد.",
    }
  );
}

function MetricCard({ metric, previous }: { metric: GrowthMetric; previous?: GrowthMetric }) {
  const copy = copyFor(metric);
  const metricAvailability = availability(metric);
  const hasRateParts =
    metric.unit === "rate" && metric.numerator != null && metric.denominator != null;

  return (
    <article className={styles.metricCard} data-state={metricAvailability}>
      <div className={styles.metricHeader}>
        <div className={styles.metricIdentity}>
          <h4>{copy.label}</h4>
          <span className={styles.metricKey}>{copy.technical}</span>
        </div>
        <span className={styles.stateBadge} data-state={metricAvailability}>
          {availabilityLabel[metricAvailability]}
        </span>
      </div>

      <strong className={styles.metricValue}>{displayValue(metric)}</strong>
      {metric.reason ? <p className={styles.metricReason}>{metric.reason}</p> : null}

      <div className={styles.metricMeta}>
        <span>{freshnessLabel(metric.freshness.asOfUtc)}</span>
        <span>{compareValue(metric, previous)}</span>
      </div>

      <div className={styles.helpers}>
        <div>
          <strong>این عدد چیست؟</strong>
          <p>{copy.what}</p>
        </div>
        <div>
          <strong>چرا مهم است؟</strong>
          <p>{copy.why}</p>
        </div>
      </div>

      <details className={styles.calculationDetails}>
        <summary>این عدد چگونه محاسبه شده؟</summary>
        <dl>
          <div>
            <dt>منبع</dt>
            <dd>{metric.source}</dd>
          </div>
          <div>
            <dt>نسخه تعریف</dt>
            <dd>{metric.definitionVersion.toLocaleString("fa-IR")}</dd>
          </div>
          {hasRateParts ? (
            <>
              <div>
                <dt>صورت</dt>
                <dd>{number.format(metric.numerator ?? 0)}</dd>
              </div>
              <div>
                <dt>مخرج</dt>
                <dd>{number.format(metric.denominator ?? 0)}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </details>
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
  const coverage = data.activityCoverage;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Founder Growth Analytics · فقط داده واقعی</span>
          <h2>از ورود کاربر تا بازگشت، درآمد و ماندگاری</h2>
          <p>
            این صفحه فقط factهای canonical Core را نمایش می‌دهد. اگر اندازه‌گیری هنوز شروع نشده یا
            پوشش تاریخی کامل نیست، به‌جای صفر ساختگی وضعیت واقعی داده را می‌بینید.
          </p>
        </div>
        <div className={styles.heroMeta}>
          <span>نسخه قرارداد {data.definitionVersion.toLocaleString("fa-IR")}</span>
          <span>منطقه زمانی: {data.freshness.timezone}</span>
          <span>{formatSnapshot(data.freshness.asOfUtc, data.freshness.timezone)}</span>
        </div>
      </section>

      {coverage ? (
        <section className={styles.coverageNotice} aria-label="وضعیت پوشش اندازه‌گیری کاربران فعال">
          <div>
            <strong>پوشش کاربران فعال</strong>
            <span>{coverage.scope === "company" ? "کل LifeMate" : coverage.scope}</span>
          </div>
          <p>
            {coverage.firstEventAtUtc
              ? `اولین event معتبر: ${formatSnapshot(coverage.firstEventAtUtc, coverage.timezone)}`
              : "هنوز هیچ app_opened canonical معتبری ثبت نشده است."}
          </p>
          {coverage.latestEventAtUtc ? (
            <p>آخرین event معتبر: {formatSnapshot(coverage.latestEventAtUtc, coverage.timezone)}</p>
          ) : null}
          <small>{coverage.note}</small>
        </section>
      ) : null}

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
        <button
          type="button"
          disabled
          title="Core هنوز aggregate export contract برای Growth Analytics ارائه نمی‌کند"
        >
          خروجی
        </button>
      </section>

      <section className={styles.scopeNotice}>
        <strong>دامنه محاسبه</strong>
        <span>حساب‌محور: {data.policy.accountScoped.join(" · ") || "—"}</span>
        <span>شخص‌محور: {data.policy.personScoped.join(" · ") || "—"}</span>
        <span>بدون ساخت داده: {data.policy.noFabrication ? "فعال" : "نامعتبر"}</span>
      </section>

      {grouped.map(({ stage, metrics }) => (
        <section className={styles.stageSection} key={stage} aria-labelledby={`stage-${stage}`}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>مرحله رشد</span>
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
                <MetricCard
                  key={metric.key}
                  metric={metric}
                  previous={previousByKey.get(metric.key)}
                />
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
        <span>مقایسه فقط وقتی نمایش داده می‌شود که هر دو دوره کامل و قابل مقایسه باشند.</span>
      </section>

      <div className={styles.links}>
        <Link href="/analytics">نمای کلی Analytics</Link>
        <Link href="/analytics/funnel">قیف فعال‌سازی</Link>
        <Link href="/analytics/cohorts">Cohorts و ماندگاری</Link>
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
