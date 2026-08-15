import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCommerceTransactionDetail,
  type CommerceAuditEvent,
  type CommerceProviderEvent,
  type CommerceRefundRequest,
  type CommerceTransactionDetail,
  type CommerceTransactionStatus,
} from "@/src/lib/admin-api/commerce-transaction-detail";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { RefundOperation } from "./RefundOperation";
import styles from "./transaction-detail.module.css";

type TransactionDetailPageProps = {
  params: Promise<{ transactionId: string }>;
};

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const statusLabels: Record<CommerceTransactionStatus, string> = {
  Pending: "در انتظار",
  Succeeded: "موفق",
  Failed: "ناموفق",
  Cancelled: "لغوشده",
  Refunded: "بازپرداخت‌شده",
  Chargeback: "برگشت بانکی",
};

const observationLabels: Record<CommerceProviderEvent["observationState"], string> = {
  InOrder: "ترتیب صحیح",
  Duplicate: "تکراری",
  OutOfOrder: "خارج از ترتیب",
};

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

function TransactionHero({ data }: { data: CommerceTransactionDetail }) {
  const transaction = data.transaction;
  return (
    <section className={styles.hero} aria-labelledby="transaction-detail-title">
      <div>
        <span className={styles.eyebrow}>Commerce · Transaction Detail</span>
        <h2 id="transaction-detail-title">جزئیات تراکنش مالی</h2>
        <p>
          وضعیت مالی نرمال‌شده، رویدادهای provider و جریان Order جدا نمایش داده می‌شوند تا مشاهده‌ی
          یک event به‌اشتباه نتیجه‌ی مالی تلقی نشود.
        </p>
        <div className={styles.heroActions}>
          <Link href="/commerce/transactions" className={styles.backLink}>
            بازگشت به تراکنش‌ها
          </Link>
          <code className={styles.transactionCode}>{shortId(transaction.transactionId)}</code>
        </div>
      </div>
      <div className={styles.heroState}>
        <span>Normalized financial state</span>
        <strong data-status={transaction.normalizedStatus}>
          {statusLabels[transaction.normalizedStatus]}
        </strong>
        <small>{formatAmount(transaction.amountMinor, transaction.currency)}</small>
      </div>
    </section>
  );
}

function Facts({ data }: { data: CommerceTransactionDetail }) {
  const transaction = data.transaction;
  const facts = [
    ["محصول", `${transaction.product.name} · ${transaction.product.code}`],
    ["Provider", transaction.provider],
    ["Provider status", transaction.providerStatus],
    ["حساب", transaction.accountLinked ? "حساب متصل است" : "بدون حساب متصل"],
    ["رخداد مالی", formatDateTime(transaction.occurredAtUtc)],
    ["دریافت", formatDateTime(transaction.receivedAtUtc)],
    ["آخرین تغییر", formatDateTime(transaction.updatedAtUtc)],
  ];

  return (
    <section className={styles.factGrid} aria-label="مشخصات تراکنش">
      {facts.map(([label, value]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function DomainContext({ data }: { data: CommerceTransactionDetail }) {
  const { order, subscription } = data.transaction;
  return (
    <section className={styles.contextGrid} aria-label="زمینه تجاری تراکنش">
      <article className={styles.contextCard} data-kind="order">
        <header>
          <span>Order ≠ Transaction</span>
          <h3>قصد تجاری / Order</h3>
        </header>
        {order ? (
          <dl>
            <div>
              <dt>Order ID</dt>
              <dd>
                <code>{shortId(order.orderId)}</code>
              </dd>
            </div>
            <div>
              <dt>وضعیت Order</dt>
              <dd>{order.status}</dd>
            </div>
            <div>
              <dt>مبلغ Order</dt>
              <dd>{formatAmount(order.amountMinor, order.currency)}</dd>
            </div>
            <div>
              <dt>آخرین تغییر</dt>
              <dd>{formatDateTime(order.updatedAtUtc)}</dd>
            </div>
          </dl>
        ) : (
          <p className={styles.emptyText}>این تراکنش Order متصل ندارد.</p>
        )}
      </article>

      <article className={styles.contextCard} data-kind="subscription">
        <header>
          <span>Subscription context</span>
          <h3>اشتراک مرتبط</h3>
        </header>
        {subscription ? (
          <dl>
            <div>
              <dt>Subscription ID</dt>
              <dd>
                <code>{shortId(subscription.subscriptionId)}</code>
              </dd>
            </div>
            <div>
              <dt>وضعیت</dt>
              <dd>{subscription.status}</dd>
            </div>
            <div>
              <dt>پلن</dt>
              <dd>{subscription.plan?.name ?? "—"}</dd>
            </div>
            <div>
              <dt>پایان دوره</dt>
              <dd>{formatDateTime(subscription.currentPeriodEndUtc)}</dd>
            </div>
          </dl>
        ) : (
          <p className={styles.emptyText}>این تراکنش Subscription متصل ندارد.</p>
        )}
      </article>
    </section>
  );
}

function ProviderTimeline({ events }: { events: CommerceProviderEvent[] }) {
  return (
    <section className={styles.timelinePanel} aria-labelledby="provider-timeline-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Provider Event Timeline</span>
          <h3 id="provider-timeline-title">مشاهدات دریافتی از درگاه</h3>
          <p>
            این timeline فقط observation است. Provider Event به‌تنهایی وضعیت نهایی Transaction نیست.
          </p>
        </div>
        <span className={styles.countBadge}>{events.length.toLocaleString("fa-IR")} event</span>
      </div>
      {events.length === 0 ? (
        <AdminPageState state="empty" title="Provider Event ثبت‌شده‌ای وجود ندارد" />
      ) : (
        <ol className={styles.timeline}>
          {events.map((event) => (
            <li key={event.eventId} data-observation={event.observationState}>
              <span className={styles.timelineDot} aria-hidden="true" />
              <div>
                <div className={styles.timelineTopline}>
                  <strong>{statusLabels[event.normalizedStatus]}</strong>
                  <span data-state={event.observationState}>
                    {observationLabels[event.observationState]}
                  </span>
                </div>
                <p>
                  Provider status: <code>{event.providerStatus}</code>
                </p>
                <time dateTime={event.receivedAtUtc}>{formatDateTime(event.receivedAtUtc)}</time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RefundHistory({ requests }: { requests: CommerceRefundRequest[] }) {
  return (
    <section className={styles.historyPanel} aria-labelledby="refund-history-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Human-review workflow</span>
          <h3 id="refund-history-title">سابقه درخواست‌های بازپرداخت</h3>
          <p>ثبت این درخواست‌ها به معنی اجرای بازپرداخت در provider نیست.</p>
        </div>
      </div>
      {requests.length === 0 ? (
        <div className={styles.emptyHistory}>هنوز درخواست بازپرداختی ثبت نشده است.</div>
      ) : (
        <div className={styles.refundList}>
          {requests.map((request) => (
            <article key={request.refundRequestId}>
              <div className={styles.refundTopline}>
                <span data-refund-status={request.status}>{request.status}</span>
                <time dateTime={request.requestedAtUtc}>{formatDateTime(request.requestedAtUtc)}</time>
              </div>
              <strong>{formatAmount(request.amountMinor, request.currency)}</strong>
              <p>{request.reason}</p>
              {request.resolutionReason ? (
                <small>نتیجه بررسی: {request.resolutionReason}</small>
              ) : (
                <small>هنوز نتیجه بررسی ثبت نشده است.</small>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function AuditEvidence({
  evidence,
}: {
  evidence: CommerceTransactionDetail["auditEvidence"];
}) {
  if (evidence.state === "forbidden") {
    return (
      <section className={styles.auditPanel} aria-labelledby="audit-title">
        <div className={styles.sectionHeading}>
          <div>
            <span>Immutable audit evidence</span>
            <h3 id="audit-title">شواهد ممیزی</h3>
            <p>برای مشاهده رخدادهای audit این منبع، مجوز security.audit.read لازم است.</p>
          </div>
          <span className={styles.permissionBadge}>security.audit.read</span>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.auditPanel} aria-labelledby="audit-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Immutable audit evidence</span>
          <h3 id="audit-title">شواهد ممیزی</h3>
          <p>شناسه حساب عامل نمایش داده نمی‌شود؛ فقط نتیجه، دلیل، زمان و correlation قابل مشاهده است.</p>
        </div>
      </div>
      {evidence.items.length === 0 ? (
        <div className={styles.emptyHistory}>رخداد audit مالی برای این تراکنش ثبت نشده است.</div>
      ) : (
        <div className={styles.auditList}>
          {evidence.items.map((event: CommerceAuditEvent) => (
            <article key={event.auditEventId}>
              <div>
                <strong>{event.action}</strong>
                <span data-result={event.result}>{event.result}</span>
              </div>
              <p>{event.reason ?? "بدون دلیل متنی"}</p>
              <footer>
                <time dateTime={event.occurredAtUtc}>{formatDateTime(event.occurredAtUtc)}</time>
                <code>{shortId(event.correlationId)}</code>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SourceStrip({ data }: { data: CommerceTransactionDetail }) {
  return (
    <div
      className={styles.sourceStrip}
      data-status={data.freshness.status}
      aria-label="منبع و تازگی داده"
    >
      <span>{data.source.label}</span>
      <span>Snapshot: {formatDateTime(data.freshness.asOfUtc)}</span>
      <span>
        {data.freshness.status === "stale" ? "وضعیت داده: نیازمند تازه‌سازی" : "وضعیت داده: تازه"}
      </span>
      <span>Provider reference و account identifier در مرورگر وجود ندارند</span>
    </div>
  );
}

async function TransactionDetailContent({ transactionId }: { transactionId: string }) {
  const result = await getCommerceTransactionDetail(transactionId);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "not_found") {
    return (
      <AdminPageState
        state="empty"
        title="تراکنش پیدا نشد"
        description="شناسه داخلی وجود ندارد یا دیگر در دفتر مالی قابل مشاهده نیست."
      />
    );
  }
  if (result.kind === "invalid") {
    return <AdminPageState state="error" title="شناسه تراکنش معتبر نیست" />;
  }
  if (result.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }

  const data = result.data;
  return (
    <div className={styles.page} dir="rtl">
      <TransactionHero data={data} />
      <SourceStrip data={data} />
      <Facts data={data} />
      <DomainContext data={data} />
      <ProviderTimeline events={data.providerEvents} />
      <RefundHistory requests={data.refundRequests} />
      <RefundOperation
        transactionId={data.transaction.transactionId}
        capability={data.refundCapability}
        requestSeed={crypto.randomUUID()}
      />
      <AuditEvidence evidence={data.auditEvidence} />
    </div>
  );
}

export default async function CommerceTransactionDetailPage({
  params,
}: TransactionDetailPageProps) {
  const admin = await requireAdminAccess();
  const { transactionId } = await params;
  const canReadCommerce = admin.permissions.includes("commerce.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="جزئیات تراکنش"
        subtitle="وضعیت مالی، timeline و عملیات audit‌شده"
      >
        {canReadCommerce ? (
          <TransactionDetailContent transactionId={transactionId} />
        ) : (
          <AdminPageState state="forbidden" />
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
