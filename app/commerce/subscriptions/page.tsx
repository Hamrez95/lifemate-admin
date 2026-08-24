import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  AdminDataTable,
  AdminPageState,
  AdminTableFilterBar,
  type AdminTableColumn,
} from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCommerceOverview,
  type CommerceOverviewResponse,
  type CommerceSubscriptionRow,
} from "@/src/lib/admin-api/commerce-overview";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import {
  CommerceDependencyGrid,
  CommerceWorkspaceHeader,
  CoreDependencyNotice,
} from "../CommerceWorkspaceHeader";
import styles from "../commerce-reference.module.css";

type SubscriptionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type SubscriptionQuery = {
  page: number;
  pageSize: number;
  product: string;
  status: string;
};

const statusLabels: Record<string, string> = {
  Active: "فعال",
  Trial: "آزمایشی",
  PastDue: "سررسید گذشته",
  Cancelled: "لغوشده",
  Expired: "منقضی",
  Refunded: "بازپرداخت‌شده",
};

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

function bounded(value: string, fallback: number, max: number): number {
  if (!/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : fallback;
}

function parseQuery(input: Record<string, string | string[] | undefined>): SubscriptionQuery {
  const pageSize = bounded(one(input.pageSize), 25, 100);
  const status = one(input.status).trim();
  return {
    page: bounded(one(input.page), 1, 100_000),
    pageSize: [25, 50, 100].includes(pageSize) ? pageSize : 25,
    product: one(input.product).trim().slice(0, 64),
    status: Object.hasOwn(statusLabels, status) ? status : "",
  };
}

function apiParams(query: SubscriptionQuery): URLSearchParams {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
  if (query.product) params.set("product", query.product);
  if (query.status) params.set("status", query.status);
  return params;
}

function pageHref(query: SubscriptionQuery, page: number): string {
  const params = apiParams({ ...query, page: Math.max(1, page) });
  return `/commerce/subscriptions?${params.toString()}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function SubscriptionMetrics({ data }: { data: CommerceOverviewResponse }) {
  const summary = data.summary.subscriptions;
  const cards = [
    ["اشتراک فعال", summary.active, "green", "Active"],
    ["Trial", summary.trial, "blue", "وضعیت ثبت‌شده در Core"],
    ["سررسید گذشته", summary.pastDue, "orange", "نیازمند پیگیری"],
    ["لغوشده", summary.cancelled, "neutral", "Cancelled"],
    ["منقضی", summary.expired, "violet", "Expired"],
    ["بازپرداخت‌شده", summary.refunded, "neutral", "Refunded"],
  ] as const;

  return (
    <section className={styles.metricGrid} aria-label="خلاصه اشتراک‌ها">
      {cards.map(([label, value, tone, hint]) => (
        <article className={styles.metricCard} data-tone={tone} key={label}>
          <span>{label}</span>
          <strong>{value.toLocaleString("fa-IR")}</strong>
          <small>{hint}</small>
        </article>
      ))}
    </section>
  );
}

const columns: readonly AdminTableColumn<CommerceSubscriptionRow>[] = [
  {
    key: "product",
    header: "محصول",
    render: (row) => (
      <div>
        <strong>{row.productName}</strong>
        <br />
        <code>{row.productCode}</code>
      </div>
    ),
  },
  {
    key: "plan",
    header: "پلن",
    render: (row) => (
      <div>
        <Link href={`/commerce/plans/${row.planId}`}>{row.planName}</Link>
        <br />
        <code>{row.planCode}</code>
      </div>
    ),
  },
  {
    key: "status",
    header: "وضعیت",
    render: (row) => statusLabels[row.status] ?? row.status,
  },
  { key: "start", header: "شروع", render: (row) => formatDateTime(row.startsAtUtc) },
  {
    key: "period-end",
    header: "پایان دوره",
    render: (row) => formatDateTime(row.currentPeriodEndUtc),
  },
  {
    key: "cancelled",
    header: "لغو",
    render: (row) => formatDateTime(row.cancelledAtUtc),
    hideOnMobile: true,
  },
  {
    key: "id",
    header: "Subscription ID",
    render: (row) => <code dir="ltr">{row.subscriptionId}</code>,
    hideOnMobile: true,
  },
];

function Filters({ query, data }: { query: SubscriptionQuery; data: CommerceOverviewResponse }) {
  return (
    <AdminTableFilterBar
      action="/commerce/subscriptions"
      clearHref="/commerce/subscriptions"
      ariaLabel="فیلتر اشتراک‌ها"
    >
      <input type="hidden" name="page" value="1" />
      <div className="admin-list-filter">
        <label htmlFor="subscription-product">محصول</label>
        <select id="subscription-product" name="product" defaultValue={query.product}>
          <option value="">همه محصولات</option>
          {data.products.map((product) => (
            <option key={product.id} value={product.code}>
              {product.name}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="subscription-status">وضعیت</label>
        <select id="subscription-status" name="status" defaultValue={query.status}>
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-list-filter admin-list-filter--compact">
        <label htmlFor="subscription-page-size">تعداد در صفحه</label>
        <select id="subscription-page-size" name="pageSize" defaultValue={String(query.pageSize)}>
          <option value="25">۲۵</option>
          <option value="50">۵۰</option>
          <option value="100">۱۰۰</option>
        </select>
      </div>
    </AdminTableFilterBar>
  );
}

function RenewalHighlights({ data }: { data: CommerceOverviewResponse }) {
  return (
    <section className={styles.panel} aria-labelledby="renewal-highlights-title">
      <header className={styles.panelHeader}>
        <div>
          <span>CORE READ MODEL</span>
          <h3 id="renewal-highlights-title">نزدیک‌ترین پایان دوره‌ها</h3>
          <p>فقط تاریخ‌هایی نمایش داده می‌شوند که Admin API در snapshot اشتراک‌ها برگردانده است.</p>
        </div>
      </header>
      {data.renewalHighlights.length === 0 ? (
        <AdminPageState state="empty" title="پایان دوره قابل نمایشی وجود ندارد" />
      ) : (
        <ul className={styles.list}>
          {data.renewalHighlights.map((row) => (
            <li key={row.subscriptionId}>
              <div>
                <strong>{row.planName}</strong>
                <br />
                <span>{row.productCode} · {statusLabels[row.status] ?? row.status}</span>
              </div>
              <time dateTime={row.currentPeriodEndUtc}>{formatDateTime(row.currentPeriodEndUtc)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function SubscriptionsContent({ query }: { query: SubscriptionQuery }) {
  const result = await getCommerceOverview(apiParams(query));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") return <AdminPageState state="error" title="فیلتر اشتراک معتبر نیست" />;
  if (result.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }

  const { data } = result;
  const previousHref = data.page > 1 ? pageHref(query, data.page - 1) : undefined;
  const nextHref = data.page * data.pageSize < data.subscriptions.total
    ? pageHref(query, data.page + 1)
    : undefined;

  return (
    <div className={styles.page} dir="rtl">
      <CommerceWorkspaceHeader
        active="subscriptions"
        eyebrow="Commerce · Reference 11"
        title="اشتراک‌ها را از وضعیت واقعی Core دنبال کن"
        description="این صفحه read-only است: وضعیت، پلن، دوره و سررسید فقط از Commerce Overview قرارداد Core نمایش داده می‌شوند. تغییر مستقیم Subscription از Command Center تعریف نشده است."
      />
      <SubscriptionMetrics data={data} />
      <CommerceDependencyGrid>
        <CoreDependencyNotice title="Subscription read model" tone="available">
          فهرست و وضعیت اشتراک‌ها از endpoint canonical موجود دریافت می‌شود و داده نمونه جایگزین آن نمی‌شود.
        </CoreDependencyNotice>
        <CoreDependencyNotice title="Trial configuration · Core #412">
          Trial فعلی فقط قابل مشاهده است. فرم تنظیم eligibility، مدت یا lifecycle تا بسته‌شدن قرارداد Core #412 فعال نمی‌شود.
        </CoreDependencyNotice>
        <CoreDependencyNotice title="Subscription mutation" tone="info">
          endpoint امنی برای دست‌کاری مستقیم اشتراک فعال وجود ندارد؛ بنابراین action مدیریتی ساختگی ارائه نشده است.
        </CoreDependencyNotice>
      </CommerceDependencyGrid>
      <div className={styles.sectionGrid}>
        <RenewalHighlights data={data} />
        <section className={styles.panel} aria-labelledby="subscription-boundary-title">
          <header className={styles.panelHeader}>
            <div>
              <span>SAFETY</span>
              <h3 id="subscription-boundary-title">مرز تغییرات تجاری</h3>
              <p>ویرایش Plan یا Price نباید اشتراک‌های موجود را بدون قرارداد migration/reprice تغییر دهد.</p>
            </div>
          </header>
          <ul className={styles.list}>
            <li><strong>Plan lifecycle</strong><span>از مسیر canonical پلن</span></li>
            <li><strong>Versioned Price</strong><span>از endpoint قیمت زمان‌دار</span></li>
            <li><strong>Trial / eligibility</strong><span>Blocked by Core #412</span></li>
          </ul>
        </section>
      </div>
      <Filters query={query} data={data} />
      <AdminDataTable
        title="اشتراک‌های ثبت‌شده"
        description="هیچ مبلغ، provider token یا اطلاعات پرداختی خارج از قرارداد Core در این جدول نمایش داده نمی‌شود."
        rows={data.subscriptions.items}
        columns={columns}
        rowKey={(row) => row.subscriptionId}
        total={data.subscriptions.total}
        freshness={{
          status: data.freshness.status,
          label: `آخرین snapshot: ${formatDateTime(data.freshness.asOfUtc)}`,
        }}
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          total: data.subscriptions.total,
          previousHref,
          nextHref,
        }}
      />
    </div>
  );
}

export default async function CommerceSubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("commerce.read");
  const query = parseQuery(await searchParams);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="اشتراک‌ها"
        subtitle="Subscription state از read-model canonical Core"
      >
        {!canRead ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense fallback={<AdminPageState state="loading" title="در حال دریافت اشتراک‌ها" />}>
            <SubscriptionsContent query={query} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
