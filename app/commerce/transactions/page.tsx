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
  getCommerceTransactions,
  isExactInternalReference,
  transactionStatuses,
  type CommerceOrderRow,
  type CommerceTransactionRow,
  type CommerceTransactionsResponse,
  type TransactionStatus,
} from "@/src/lib/admin-api/commerce-transactions";
import { requireAdminAccess } from "@/src/lib/admin-api/server";
import { tehranDayBoundaryToUtc } from "@/src/lib/time-zone";

import styles from "./transactions.module.css";

type TransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type TransactionsQuery = {
  page: number;
  pageSize: number;
  product: string;
  provider: string;
  status: string;
  from: string;
  to: string;
  q: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const transactionStatusLabels: Record<TransactionStatus, string> = {
  Pending: "در انتظار",
  Succeeded: "موفق",
  Failed: "ناموفق",
  Cancelled: "لغوشده",
  Refunded: "بازپرداخت",
  Chargeback: "برگشت بانکی",
};

const orderStatusLabels: Record<string, string> = {
  Pending: "در انتظار",
  Authorized: "تأیید اولیه",
  Paid: "پرداخت‌شده",
  Failed: "ناموفق",
  Cancelled: "لغوشده",
  Refunded: "بازپرداخت",
  Chargeback: "برگشت بانکی",
};

const observationLabels: Record<string, string> = {
  InOrder: "ترتیب صحیح",
  Duplicate: "رویداد تکراری",
  OutOfOrder: "خارج از ترتیب",
  NoEvent: "بدون رویداد",
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function boundedPage(value: string, fallback: number, max: number): number {
  if (!/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : fallback;
}

function safeCode(value: string): string {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(value) ? value : "";
}

function safeDay(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function parseQuery(input: Record<string, string | string[] | undefined>): TransactionsQuery {
  const pageSizeCandidate = boundedPage(one(input.pageSize), 25, 100);
  const status = one(input.status).trim();
  const q = one(input.q).trim();
  return {
    page: boundedPage(one(input.page), 1, 100_000),
    pageSize: [25, 50, 100].includes(pageSizeCandidate) ? pageSizeCandidate : 25,
    product: safeCode(one(input.product).trim()),
    provider: safeCode(one(input.provider).trim()),
    status: transactionStatuses.includes(status as TransactionStatus) ? status : "",
    from: safeDay(one(input.from).trim()),
    to: safeDay(one(input.to).trim()),
    q: isExactInternalReference(q) ? q : "",
  };
}

function apiParams(query: TransactionsQuery): URLSearchParams {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.product) params.set("product", query.product);
  if (query.provider) params.set("provider", query.provider);
  if (query.status) params.set("status", query.status);
  if (query.from) params.set("from", tehranDayBoundaryToUtc(query.from, "start"));
  if (query.to) params.set("to", tehranDayBoundaryToUtc(query.to, "end"));
  if (query.q) params.set("q", query.q);
  return params;
}

function pageHref(query: TransactionsQuery, page: number): string {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, page)));
  params.set("pageSize", String(query.pageSize));
  if (query.product) params.set("product", query.product);
  if (query.provider) params.set("provider", query.provider);
  if (query.status) params.set("status", query.status);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.q) params.set("q", query.q);
  return `/commerce/transactions?${params.toString()}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function formatAmount(amountMinor: string, currency: string): string {
  try {
    return `${BigInt(amountMinor).toLocaleString("fa-IR")} ${currency}`;
  } catch {
    return "—";
  }
}

function shortId(value: string | null): string {
  if (!value) return "—";
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function SummaryCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  tone: "green" | "blue" | "orange" | "danger" | "violet";
}) {
  return (
    <article className={styles.summaryCard} data-tone={tone}>
      <span>{label}</span>
      <strong>{value.toLocaleString("fa-IR")}</strong>
      <small>{note}</small>
    </article>
  );
}

function TransactionHero() {
  return (
    <section className={styles.hero} aria-labelledby="transactions-title">
      <div>
        <span className={styles.eyebrow}>Commerce Ledger · Read only</span>
        <h2 id="transactions-title">جریان مالی را ببین؛ بدون دیدن رازهای پرداخت</h2>
        <p>
          Order قصد تجاری است، Transaction وضعیت مالی نرمال‌شده و Provider Event فقط مشاهده‌ی ورودی
          درگاه. این سه مفهوم عمداً با هم ادغام نشده‌اند.
        </p>
        <div className={styles.heroActions}>
          <Link href="/commerce" className={styles.secondaryAction}>
            بازگشت به نمای تجارت
          </Link>
          <span className={styles.readOnlyBadge}>فقط خواندنی</span>
        </div>
      </div>
      <div className={styles.heroVisual} aria-hidden="true">
        <span className={styles.flowNode} data-kind="order">
          Order
        </span>
        <i>←</i>
        <span className={styles.flowNode} data-kind="transaction">
          Transaction
        </span>
        <i>←</i>
        <span className={styles.flowNode} data-kind="event">
          Event
        </span>
      </div>
    </section>
  );
}

function Summary({ data }: { data: CommerceTransactionsResponse }) {
  return (
    <section className={styles.summaryGrid} aria-label="خلاصه تراکنش‌ها">
      <SummaryCard label="کل تراکنش" value={data.summary.total} note="در فیلتر فعلی" tone="blue" />
      <SummaryCard
        label="موفق"
        value={data.summary.succeeded}
        note="Normalized · Succeeded"
        tone="green"
      />
      <SummaryCard
        label="در انتظار"
        value={data.summary.pending}
        note="نیازمند تکمیل جریان"
        tone="orange"
      />
      <SummaryCard
        label="ناموفق"
        value={data.summary.failed}
        note="Normalized · Failed"
        tone="danger"
      />
      <SummaryCard
        label="بازپرداخت / برگشت"
        value={data.summary.refunded + data.summary.chargeback}
        note="Refunded + Chargeback"
        tone="violet"
      />
    </section>
  );
}

function AnomalyPanel({ data }: { data: CommerceTransactionsResponse }) {
  const clean = data.anomalies.duplicateEvents === 0 && data.anomalies.outOfOrderEvents === 0;
  return (
    <section
      className={styles.anomalyPanel}
      data-clean={clean}
      aria-labelledby="provider-events-title"
    >
      <div>
        <span>Provider Event Diagnostics</span>
        <h3 id="provider-events-title">سلامت ترتیب رویدادهای درگاه</h3>
        <p>
          این اعداد وضعیت مالی کاربر نیستند؛ فقط نشان می‌دهند event دریافتی تکراری یا خارج از ترتیب
          زمانی بوده است.
        </p>
      </div>
      <dl>
        <div>
          <dt>Duplicate</dt>
          <dd>{data.anomalies.duplicateEvents.toLocaleString("fa-IR")}</dd>
        </div>
        <div>
          <dt>Out of order</dt>
          <dd>{data.anomalies.outOfOrderEvents.toLocaleString("fa-IR")}</dd>
        </div>
      </dl>
    </section>
  );
}

function Filters({
  query,
  data,
}: {
  query: TransactionsQuery;
  data: CommerceTransactionsResponse;
}) {
  return (
    <AdminTableFilterBar
      action="/commerce/transactions"
      clearHref="/commerce/transactions"
      ariaLabel="فیلتر تراکنش‌ها"
    >
      <input type="hidden" name="page" value="1" />
      <div className="admin-list-filter">
        <label htmlFor="transaction-product">محصول</label>
        <select id="transaction-product" name="product" defaultValue={query.product}>
          <option value="">همه محصولات</option>
          {data.products.map((product) => (
            <option key={product.id} value={product.code}>
              {product.name}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="transaction-provider">درگاه / Provider</label>
        <select id="transaction-provider" name="provider" defaultValue={query.provider}>
          <option value="">همه providerها</option>
          {data.providers.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="transaction-status">وضعیت مالی</label>
        <select id="transaction-status" name="status" defaultValue={query.status}>
          <option value="">همه وضعیت‌ها</option>
          {transactionStatuses.map((status) => (
            <option key={status} value={status}>
              {transactionStatusLabels[status]}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="transaction-from">از تاریخ</label>
        <input id="transaction-from" name="from" type="date" defaultValue={query.from} />
      </div>
      <div className="admin-list-filter">
        <label htmlFor="transaction-to">تا تاریخ</label>
        <input id="transaction-to" name="to" type="date" defaultValue={query.to} />
      </div>
      <div className="admin-list-filter admin-list-filter--wide">
        <label htmlFor="transaction-reference">شناسه داخلی دقیق</label>
        <input
          id="transaction-reference"
          name="q"
          type="search"
          dir="ltr"
          inputMode="text"
          placeholder="UUID"
          defaultValue={query.q}
        />
      </div>
      <div className="admin-list-filter admin-list-filter--compact">
        <label htmlFor="transaction-page-size">تعداد در صفحه</label>
        <select id="transaction-page-size" name="pageSize" defaultValue={String(query.pageSize)}>
          <option value="25">۲۵</option>
          <option value="50">۵۰</option>
          <option value="100">۱۰۰</option>
        </select>
      </div>
    </AdminTableFilterBar>
  );
}

const transactionColumns: readonly AdminTableColumn<CommerceTransactionRow>[] = [
  {
    key: "status",
    header: "وضعیت مالی",
    render: (row) => (
      <span className={styles.statusBadge} data-status={row.normalizedStatus}>
        {transactionStatusLabels[row.normalizedStatus]}
      </span>
    ),
  },
  {
    key: "amount",
    header: "مبلغ",
    render: (row) => (
      <strong className={styles.amount}>{formatAmount(row.amountMinor, row.currency)}</strong>
    ),
  },
  {
    key: "product",
    header: "محصول",
    render: (row) => (
      <div className={styles.productCell}>
        <strong>{row.productName}</strong>
        <code>{row.productCode}</code>
      </div>
    ),
  },
  {
    key: "provider",
    header: "Provider",
    render: (row) => (
      <div className={styles.providerCell}>
        <strong>{row.provider}</strong>
        <small>{row.providerStatus}</small>
      </div>
    ),
  },
  {
    key: "observation",
    header: "Event observation",
    mobileLabel: "وضعیت event",
    render: (row) => (
      <span className={styles.eventBadge} data-state={row.observationState}>
        {observationLabels[row.observationState]}
      </span>
    ),
  },
  {
    key: "time",
    header: "دریافت",
    render: (row) => <time dateTime={row.receivedAtUtc}>{formatDateTime(row.receivedAtUtc)}</time>,
  },
  {
    key: "reference",
    header: "جزئیات",
    render: (row) => (
      <Link
        href={`/commerce/transactions/${row.transactionId}`}
        className={styles.detailLink}
        aria-label={`مشاهده جزئیات تراکنش ${shortId(row.transactionId)}`}
      >
        <code className={styles.identifier}>{shortId(row.transactionId)}</code>
        <span aria-hidden="true">←</span>
      </Link>
    ),
  },
];

function RecentOrders({ data }: { data: CommerceTransactionsResponse }) {
  return (
    <section className={styles.ordersPanel} aria-labelledby="recent-orders-title">
      <header>
        <div>
          <span>Order Intent</span>
          <h3 id="recent-orders-title">سفارش‌های اخیر</h3>
          <p>
            Order یعنی قصد خرید/تمدید؛ موفق بودن Transaction را نتیجه‌گیری نمی‌کند. فیلتر provider و
            وضعیت مالی از طریق Transaction متصل اعمال می‌شود؛ Order بدون Transaction هنگام استفاده
            از این دو فیلتر نمایش داده نمی‌شود.
          </p>
        </div>
        <span className={styles.resultChip}>
          نمایش {data.recentOrders.items.length.toLocaleString("fa-IR")} از{" "}
          {data.recentOrders.total.toLocaleString("fa-IR")}
        </span>
      </header>
      {data.recentOrders.items.length === 0 ? (
        <AdminPageState state="empty" title="سفارشی برای بازه فعلی وجود ندارد" />
      ) : (
        <div className={styles.orderGrid}>
          {data.recentOrders.items.map((order: CommerceOrderRow) => (
            <article className={styles.orderCard} key={order.orderId}>
              <div className={styles.orderTopline}>
                <span className={styles.statusBadge} data-status={order.status}>
                  {orderStatusLabels[order.status] ?? order.status}
                </span>
                <span className={styles.transactionLinkState} data-linked={order.hasTransaction}>
                  {order.hasTransaction ? "Transaction متصل" : "هنوز بدون Transaction"}
                </span>
              </div>
              <strong>{formatAmount(order.amountMinor, order.currency)}</strong>
              <span>{order.productName}</span>
              <dl>
                <div>
                  <dt>Order ID</dt>
                  <dd>
                    <code>{shortId(order.orderId)}</code>
                  </dd>
                </div>
                <div>
                  <dt>آخرین تغییر</dt>
                  <dd>
                    <time dateTime={order.updatedAtUtc}>{formatDateTime(order.updatedAtUtc)}</time>
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

async function TransactionsContent({ query }: { query: TransactionsQuery }) {
  const result = await getCommerceTransactions(apiParams(query));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="فیلتر تراکنش معتبر نیست"
        description="برای جست‌وجوی شناسه فقط UUID داخلی دقیق و برای سایر فیلترها گزینه‌های مجاز را استفاده کن."
      />
    );
  }
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
  const nextHref =
    data.page * data.pageSize < data.transactions.total
      ? pageHref(query, data.page + 1)
      : undefined;

  return (
    <div className={styles.page} dir="rtl">
      <TransactionHero />
      <div className={styles.sourceStrip} aria-label="منبع و تازگی داده">
        <span>{data.source.label}</span>
        <span>Snapshot: {formatDateTime(data.freshness.asOfUtc)}</span>
        <span>شناسه حساب و provider reference در پاسخ API وجود ندارند</span>
      </div>
      <Summary data={data} />
      <AnomalyPanel data={data} />
      <Filters query={query} data={data} />
      <AdminDataTable
        title="تراکنش‌ها"
        description="وضعیت مالی نرمال‌شده؛ بدون credential، payload خام یا provider reference. هر تراکنش مسیر جزئیات audit-ready جدا دارد."
        rows={data.transactions.items}
        columns={transactionColumns}
        rowKey={(row) => row.transactionId}
        total={data.transactions.total}
        freshness={{
          status: data.freshness.status,
          label: `آخرین دریافت: ${formatDateTime(data.freshness.asOfUtc)}`,
        }}
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          total: data.transactions.total,
          previousHref,
          nextHref,
        }}
      />
      <RecentOrders data={data} />
    </div>
  );
}

export default async function CommerceTransactionsPage({ searchParams }: TransactionsPageProps) {
  const admin = await requireAdminAccess();
  const query = parseQuery(await searchParams);
  const canReadCommerce = admin.permissions.includes("commerce.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="تراکنش‌ها و سفارش‌ها"
        subtitle="دفتر مالی امن و خواندنی LifeMate"
      >
        {!canReadCommerce ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense
            fallback={<AdminPageState state="loading" title="در حال دریافت دفتر تراکنش‌ها" />}
          >
            <TransactionsContent query={query} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
