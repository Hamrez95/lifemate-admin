import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState, AdminPagination } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getRelationshipLedger,
  type RelationshipLedgerItem,
} from "@/src/lib/admin-api/relationship-ledger";
import type { RelationshipOverviewKind } from "@/src/lib/admin-api/relationship-overview";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./ledger.module.css";

type LedgerPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const kindMeta: Record<
  RelationshipOverviewKind,
  { label: string; symbol: string; tone: string }
> = {
  relationship: { label: "Relationship", symbol: "♡", tone: "green" },
  consent: { label: "Consent", symbol: "✓", tone: "violet" },
  access_grant: { label: "Access Grant", symbol: "⌁", tone: "blue" },
};

const eventLabels: Record<string, string> = {
  relationship_created: "رابطه ایجاد شد",
  relationship_ended: "رابطه پایان یافت",
  granted: "رضایت اعطا شد",
  revoked: "رضایت لغو شد",
  expired: "رضایت منقضی شد",
  superseded: "رضایت جایگزین شد",
  grant_created: "مجوز دسترسی ایجاد شد",
  grant_revoked: "مجوز دسترسی لغو شد",
  grant_expired: "مجوز دسترسی منقضی شد",
};

const statusLabels: Record<string, string> = {
  Active: "فعال",
  Ended: "پایان‌یافته",
  Revoked: "لغوشده",
  Expired: "منقضی",
  Granted: "اعطاشده",
  Superseded: "جایگزین‌شده",
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

function filtersFrom(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const key of ["page", "pageSize", "kind", "status", "from", "to"] as const) {
    const value = one(input[key]).trim();
    if (value) params.set(key, value);
  }
  return params;
}

function pageHref(filters: URLSearchParams, page: number): string {
  const next = new URLSearchParams(filters);
  next.set("page", String(page));
  return `/relationships/ledger?${next.toString()}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function eventLabel(value: string): string {
  return eventLabels[value] ?? value.replaceAll("_", " ");
}

function statusLabel(value: string): string {
  return statusLabels[value] ?? value;
}

function recordTitle(item: RelationshipLedgerItem): string {
  if (item.kind === "relationship") return item.type ?? "Relationship";
  if (item.kind === "consent") return item.purpose ?? "Consent";
  return item.context ?? "Access Grant";
}

function evidenceLabel(item: RelationshipLedgerItem): string {
  return item.evidence === "event"
    ? "رویداد ثبت‌شده"
    : "از timestamp چرخه عمر";
}

function LedgerItem({ item }: { item: RelationshipLedgerItem }) {
  const meta = kindMeta[item.kind];
  return (
    <article className={styles.timelineItem} data-tone={meta.tone}>
      <div className={styles.rail} aria-hidden="true">
        <span>{meta.symbol}</span>
      </div>
      <div className={styles.eventCard}>
        <div className={styles.eventHeader}>
          <div>
            <span className={styles.kindBadge}>{meta.label}</span>
            <h3>{eventLabel(item.eventType)}</h3>
          </div>
          <time dateTime={item.occurredAtUtc}>{formatDateTime(item.occurredAtUtc)}</time>
        </div>

        <div className={styles.eventMain}>
          <div>
            <span className={styles.metaLabel}>موضوع</span>
            <strong>{recordTitle(item)}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>وضعیت</span>
            <span className={styles.statusBadge} data-status={item.status}>
              {statusLabel(item.status)}
            </span>
          </div>
          {item.scopeCount !== null ? (
            <div>
              <span className={styles.metaLabel}>Scopeها</span>
              <strong>{item.scopeCount.toLocaleString("fa-IR")}</strong>
            </div>
          ) : null}
        </div>

        <div className={styles.evidenceRow}>
          <span className={styles.evidenceBadge} data-evidence={item.evidence}>
            {evidenceLabel(item)}
          </span>
          {item.subjectPersonId ? (
            <code title="شناسه Person موضوع رکورد">{item.subjectPersonId}</code>
          ) : null}
          <code title="شناسه موجودیت">{item.entityId}</code>
        </div>
      </div>
    </article>
  );
}

async function LedgerContent({ filters }: { filters: URLSearchParams }) {
  const result = await getRelationshipLedger(filters);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="فیلتر Ledger معتبر نیست"
        description="بازه زمانی حداکثر ۳۶۶ روز است و نوع/وضعیت باید از مقادیر مجاز باشد."
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

  const data = result.data;
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const previousHref = data.page > 1 ? pageHref(filters, data.page - 1) : undefined;
  const nextHref = data.page < totalPages ? pageHref(filters, data.page + 1) : undefined;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <Link className={styles.backLink} href="/relationships">
            بازگشت به نمای روابط و رضایت
          </Link>
          <span className={styles.eyebrow}>Canonical Trust Ledger</span>
          <h2>تاریخچه قابل پیگیری اعتماد و دسترسی</h2>
          <p>
            Consent eventهای واقعی مستقیماً از تاریخچه رویداد خوانده می‌شوند. برای Relationship و
            Access Grant فقط timestampهای persisted چرخه عمر نمایش داده می‌شوند؛ هیچ audit ساختگی
            تولید نمی‌شود.
          </p>
        </div>
        <div className={styles.heroLegend} aria-label="نوع شواهد Ledger">
          <div>
            <span className={styles.legendDot} data-evidence="event" />
            <strong>Event</strong>
            <small>رویداد canonical ذخیره‌شده</small>
          </div>
          <div>
            <span className={styles.legendDot} data-evidence="lifecycle_timestamp" />
            <strong>Lifecycle timestamp</strong>
            <small>شاهد مستقیم از created / ended / revoked / expired</small>
          </div>
        </div>
      </section>

      <section className={styles.filterCard} aria-labelledby="ledger-filters-title">
        <div className={styles.filterIntro}>
          <span className={styles.eyebrow}>فیلتر Ledger</span>
          <h3 id="ledger-filters-title">نوع، وضعیت و بازه زمانی</h3>
          <p>بازه‌ها با منطقه زمانی Asia/Tehran و حداکثر ۳۶۶ روز محاسبه می‌شوند.</p>
        </div>
        <form className={styles.filters} method="get">
          <label>
            <span>از تاریخ</span>
            <input type="date" name="from" defaultValue={data.filters.from} />
          </label>
          <label>
            <span>تا تاریخ</span>
            <input type="date" name="to" defaultValue={data.filters.to} />
          </label>
          <label>
            <span>نوع</span>
            <select name="kind" defaultValue={data.filters.kind ?? ""}>
              <option value="">همه انواع</option>
              <option value="relationship">Relationship</option>
              <option value="consent">Consent</option>
              <option value="access_grant">Access Grant</option>
            </select>
          </label>
          <label>
            <span>وضعیت</span>
            <input
              name="status"
              maxLength={32}
              defaultValue={data.filters.status ?? ""}
              placeholder="مثلاً Revoked"
            />
          </label>
          <input type="hidden" name="pageSize" value={data.pageSize} />
          <button type="submit">اعمال فیلتر</button>
        </form>
      </section>

      <section className={styles.ledgerCard} aria-labelledby="ledger-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Timeline</span>
            <h3 id="ledger-title">رویدادها و شواهد چرخه عمر</h3>
            <p>
              {data.total.toLocaleString("fa-IR")} رکورد مطابق فیلتر · تازه‌سازی:{" "}
              {formatDateTime(data.freshness.asOfUtc)}
            </p>
          </div>
          <span className={styles.pageBadge}>
            صفحه {data.page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
          </span>
        </div>

        {data.items.length === 0 ? (
          <AdminPageState state="empty" title="رویدادی در این بازه پیدا نشد" />
        ) : (
          <div className={styles.timeline}>
            {data.items.map((item) => (
              <LedgerItem key={item.ledgerId} item={item} />
            ))}
          </div>
        )}

        <AdminPagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          previousHref={previousHref}
          nextHref={nextHref}
          ariaLabel="صفحه‌بندی Ledger روابط، رضایت‌ها و مجوزها"
        />
      </section>
    </div>
  );
}

export default async function RelationshipLedgerPage({ searchParams }: LedgerPageProps) {
  const admin = await requireAdminAccess();
  const canReadRelationships = admin.permissions.includes("relationships.read");
  const filters = filtersFrom(await searchParams);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="relationships"
        title="Ledger روابط و رضایت"
        subtitle="تاریخچه قابل پیگیری Relationship، Consent و Access Grant"
      >
        {!canReadRelationships ? (
          <AdminPageState state="forbidden" />
        ) : (
          <LedgerContent filters={filters} />
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
