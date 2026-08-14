import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AdminDataTable,
  AdminPageState,
  type AdminTableColumn,
} from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCommerceDashboard,
  type CommerceDashboardResponse,
  type CommerceSubscriptionItem,
  type CommerceSubscriptionStatus,
} from "@/src/lib/admin-api/commerce-dashboard";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./commerce.module.css";

type CommercePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const statusLabels: Record<CommerceSubscriptionStatus, string> = {
  Trial: "آزمایشی",
  Active: "فعال",
  PastDue: "سررسید گذشته",
  Cancelled: "لغوشده",
  Expired: "منقضی",
  Refunded: "بازپرداخت‌شده",
};

const statusOrder: CommerceSubscriptionStatus[] = [
  "Active",
  "Trial",
  "PastDue",
  "Cancelled",
  "Expired",
  "Refunded",
];

const numberFormatter = new Intl.NumberFormat("fa-IR");
const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function positiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildApiParams(input: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(positiveInteger(one(input.page), 1)));
  params.set("pageSize", "25");
  for (const key of ["product", "plan", "status"] as const) {
    const value = one(input[key]).trim();
    if (value) params.set(key, value);
  }
  return params;
}

function pageHref(data: CommerceDashboardResponse, page: number): string {
  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    pageSize: String(data.pageSize),
  });
  if (data.filters.product) params.set("product", data.filters.product);
  if (data.filters.plan) params.set("plan", data.filters.plan);
  if (data.filters.status) params.set("status", data.filters.status);
  return `/commerce?${params.toString()}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function shortId(value: string): string {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function SummaryCards({ data }: { data: CommerceDashboardResponse }) {
  return (
    <section className={styles.summarySection} aria-labelledby="commerce-summary-title">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>Subscription health</span>
          <h3 id="commerce-summary-title">وضعیت اشتراک‌ها</h3>
          <p>اعداد از رکوردهای واقعی subscription می‌آیند و فیلتر محصول/پلن را رعایت می‌کنند.</p>
        </div>
        <div className={styles.totalPill}>
          <strong>{numberFormatter.format(data.summary.total)}</strong>
          <span>کل اشتراک</span>
        </div>
      </div>
      <div className={styles.summaryGrid}>
        {statusOrder.map((status) => (
          <article className={styles.summaryCard} data-status={status} key={status}>
            <span className={styles.statusDot} aria-hidden="true" />
            <strong>{numberFormatter.format(data.summary[status])}</strong>
            <span>{statusLabels[status]}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlanDistribution({ data }: { data: CommerceDashboardResponse }) {
  const maximum = Math.max(...data.planDistribution.map((item) => item.subscriptionCount), 1);
  return (
    <section className={styles.insightCard} aria-labelledby="plan-distribution-title">
      <div className={styles.cardHeading}>
        <div>
          <span className={styles.eyebrow}>Plan distribution</span>
          <h3 id="plan-distribution-title">توزیع پلن‌ها</h3>
        </div>
        <span>Plan ≠ Subscription</span>
      </div>
      {data.planDistribution.length === 0 ? (
        <AdminPageState
          state="empty"
          title="پلنی برای این فیلتر پیدا نشد"
          description="در نبود رکورد واقعی، نمودار ساختگی نمایش داده نمی‌شود."
        />
      ) : (
        <div className={styles.barList}>
          {data.planDistribution.slice(0, 8).map((item) => (
            <div className={styles.barRow} key={`${item.productCode}:${item.planCode}`}>
              <div className={styles.barMeta}>
                <strong>{item.planName}</strong>
                <span>
                  {item.productCode} · {item.planCode}
                </span>
              </div>
              <div className={styles.barTrack} aria-hidden="true">
                <span style={{ width: `${Math.max(2, (item.subscriptionCount / maximum) * 100)}%` }} />
              </div>
              <b>{numberFormatter.format(item.subscriptionCount)}</b>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EntitlementCoverage({ data }: { data: CommerceDashboardResponse }) {
  return (
    <section className={styles.insightCard} aria-labelledby="entitlement-title">
      <div className={styles.cardHeading}>
        <div>
          <span className={styles.eyebrow}>Entitlement coverage</span>
          <h3 id="entitlement-title">دسترسی‌های فعال</h3>
        </div>
        <span>Entitlement ≠ Plan</span>
      </div>
      {data.entitlementCoverage.length === 0 ? (
        <AdminPageState
          state="empty"
          title="Entitlement قابل نمایش وجود ندارد"
          description="مقادیر خالی به صفر ساختگی تبدیل نمی‌شوند."
        />
      ) : (
        <div className={styles.entitlementList}>
          {data.entitlementCoverage.slice(0, 10).map((item) => (
            <article key={item.featureCode}>
              <code>{item.featureCode}</code>
              <strong>{numberFormatter.format(item.activeCount)}</strong>
              <span>فعال</span>
              {item.expiringSoonCount > 0 ? (
                <small>{numberFormatter.format(item.expiringSoonCount)} مورد تا ۳۰ روز آینده منقضی می‌شود</small>
              ) : (
                <small>انقضای نزدیک ثبت نشده</small>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RenewalHighlights({ data }: { data: CommerceDashboardResponse }) {
  return (
    <section className={styles.renewalCard} aria-labelledby="renewal-title">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>Next 30 days</span>
          <h3 id="renewal-title">سررسیدهای نزدیک</h3>
          <p>فقط اشتراک‌های Trial / Active / PastDue با پایان دوره واقعی در ۳۰ روز آینده.</p>
        </div>
      </div>
      {data.renewalHighlights.length === 0 ? (
        <AdminPageState state="empty" title="سررسید نزدیکی ثبت نشده است" />
      ) : (
        <div className={styles.renewalGrid}>
          {data.renewalHighlights.map((item) => (
            <article key={item.subscriptionId}>
              <div>
                <span className={styles.subscriptionStatus} data-status={item.status}>
                  {statusLabels[item.status]}
                </span>
                <strong>
                  {item.productCode} / {item.planCode}
                </strong>
              </div>
              <b>{numberFormatter.format(item.daysRemaining)} روز</b>
              <small>{formatDate(item.currentPeriodEndUtc)}</small>
              <Link href={`/users/${item.customerAccountId}`}>مشاهده کاربر</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const subscriptionColumns: readonly AdminTableColumn<CommerceSubscriptionItem>[] = [
  {
    key: "subscription",
    header: "اشتراک",
    render: (row) => (
      <div className={styles.subscriptionIdentity}>
        <strong>{row.planName}</strong>
        <code title={row.subscriptionId}>{shortId(row.subscriptionId)}</code>
      </div>
    ),
  },
  {
    key: "product",
    header: "محصول / پلن",
    render: (row) => (
      <div className={styles.productPlan}>
        <strong>{row.productName}</strong>
        <span>
          {row.productCode} · {row.planCode}
        </span>
      </div>
    ),
  },
  {
    key: "status",
    header: "وضعیت",
    render: (row) => (
      <span className={styles.subscriptionStatus} data-status={row.status}>
        {statusLabels[row.status]}
      </span>
    ),
  },
  {
    key: "customer",
    header: "حساب کاربر",
    render: (row) => (
      <Link className={styles.userLink} href={`/users/${row.customerAccountId}`} title={row.customerAccountId}>
        {shortId(row.customerAccountId)}
      </Link>
    ),
  },
  {
    key: "provider",
    header: "Provider",
    render: (row) => <span className={styles.providerPill}>{row.provider}</span>,
    hideOnMobile: true,
  },
  {
    key: "periodEnd",
    header: "پایان دوره",
    render: (row) => formatDate(row.currentPeriodEndUtc),
  },
];

function CommerceFilters({ data }: { data: CommerceDashboardResponse }) {
  return (
    <section className={styles.filterCard} aria-labelledby="commerce-filters-title">
      <div>
        <span className={styles.eyebrow}>فیلتر امن</span>
        <h3 id="commerce-filters-title">محصول، پلن و وضعیت</h3>
        <p>فیلترها server-side هستند و هر صفحه حداکثر ۲۵ رکورد نمایش می‌دهد.</p>
      </div>
      <form className={styles.filters} method="get">
        <label>
          <span>محصول</span>
          <select name="product" defaultValue={data.filters.product ?? ""}>
            <option value="">همه محصولات</option>
            {data.products.map((product) => (
              <option key={product.code} value={product.code}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>پلن</span>
          <select name="plan" defaultValue={data.filters.plan ?? ""}>
            <option value="">همه پلن‌ها</option>
            {data.plans.map((plan) => (
              <option key={`${plan.productCode}:${plan.code}`} value={plan.code}>
                {plan.name} · {plan.productCode}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>وضعیت اشتراک</span>
          <select name="status" defaultValue={data.filters.status ?? ""}>
            <option value="">همه وضعیت‌ها</option>
            {statusOrder.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">اعمال فیلتر</button>
      </form>
    </section>
  );
}

async function CommerceContent({ params }: { params: URLSearchParams }) {
  const result = await getCommerceDashboard(params);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="فیلتر انتخاب‌شده معتبر نیست"
        description="محصول، پلن یا وضعیت اشتراک را از گزینه‌های معتبر انتخاب کن."
      />
    );
  }
  if (result.kind !== "ok") {
    return (
      <AdminPageState
        state="unavailable"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }

  const data = result.data;
  const nextPage = data.page * data.pageSize < data.total ? pageHref(data, data.page + 1) : undefined;
  const previousPage = data.page > 1 ? pageHref(data, data.page - 1) : undefined;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.heroEyebrow}>LifeMate · Commerce Control</span>
          <h2>اشتراک، پلن و دسترسی؛ سه مفهوم جدا، یک تصویر قابل اعتماد</h2>
          <p>
            این داشبورد وضعیت فروش را از داده واقعی Commerce می‌خواند. عدد ناموجود ساخته نمی‌شود و
            اطلاعات پرداخت حساس هرگز وارد این نما نمی‌شود.
          </p>
        </div>
        <div className={styles.heroLegend} aria-label="مدل Commerce">
          <span><b>Plan</b> بسته تجاری</span>
          <span><b>Subscription</b> قرارداد فعال/تاریخی</span>
          <span><b>Entitlement</b> دسترسی واقعی به قابلیت</span>
        </div>
      </section>

      <CommerceFilters data={data} />
      <div className={styles.freshnessStrip}>
        <span data-status={data.freshness.status}>{data.freshness.status === "fresh" ? "داده تازه" : "داده قدیمی"}</span>
        <span>آخرین دریافت: {formatDate(data.freshness.asOfUtc)}</span>
        <span>بدون درآمد یا KPI ساختگی</span>
      </div>

      <SummaryCards data={data} />
      <div className={styles.insightGrid}>
        <PlanDistribution data={data} />
        <EntitlementCoverage data={data} />
      </div>
      <RenewalHighlights data={data} />

      <AdminDataTable
        title="اشتراک‌ها"
        description="فهرست صفحه‌بندی‌شده با حداقل شناسه لازم برای عملیات؛ provider reference و داده پرداخت نمایش داده نمی‌شود."
        rows={data.subscriptions}
        columns={subscriptionColumns}
        rowKey={(row) => row.subscriptionId}
        total={data.total}
        freshness={{
          status: data.freshness.status,
          label: data.freshness.status === "fresh" ? "منبع تازه" : "منبع قدیمی",
        }}
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
          previousHref: previousPage,
          nextHref: nextPage,
          ariaLabel: "صفحه‌بندی اشتراک‌ها",
        }}
      />
    </div>
  );
}

export default async function CommercePage({ searchParams }: CommercePageProps) {
  const admin = await requireAdminAccess();
  const canReadCommerce = admin.permissions.includes("commerce.read");
  const apiParams = buildApiParams(await searchParams);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="فروش و تجارت"
        subtitle="اشتراک‌ها، پلن‌ها و entitlementهای واقعی؛ بدون میانبر امنیتی"
      >
        {canReadCommerce ? <CommerceContent params={apiParams} /> : <AdminPageState state="forbidden" />}
      </AdminShell>
    </AdminSessionProvider>
  );
}
