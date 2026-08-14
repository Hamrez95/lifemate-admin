import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import "./support.css";

import {
  AdminDataTable,
  AdminPageState,
  AdminTableFilterBar,
  parseTableQuery,
  toTableSearchParams,
  type AdminTableColumn,
} from "@/src/components/admin-data-table";
import { parseFilterState, type FilterState } from "@/src/components/admin-data-table/filter-state";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";
import {
  getSupportQueue,
  type SupportSlaState,
  type SupportTicketQueueItem,
} from "@/src/lib/admin-api/support-queue";

const filterRules = {
  status: { maxValues: 1, maxValueLength: 32 },
  priority: { maxValues: 1, maxValueLength: 16 },
  product: { maxValues: 1, maxValueLength: 64 },
  sla: { maxValues: 1, maxValueLength: 24 },
  assignee: { maxValues: 1, maxValueLength: 64 },
} as const;

const statusLabels: Record<string, string> = {
  Open: "باز",
  Pending: "در انتظار بررسی",
  WaitingOnUser: "منتظر کاربر",
  Resolved: "حل‌شده",
  Closed: "بسته",
};

const priorityLabels: Record<string, string> = {
  Urgent: "فوری",
  High: "بالا",
  Normal: "عادی",
  Low: "پایین",
};

const slaLabels: Record<SupportSlaState, string> = {
  Breached: "نقض SLA",
  DueSoon: "نزدیک سررسید",
  OnTrack: "در مسیر",
  Completed: "تکمیل‌شده",
};

const productLabels: Record<string, string> = {
  wellmate: "WellMate",
  caremate: "CareMate",
};

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type SupportPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type SupportQuery = {
  table: ReturnType<typeof parseTableQuery>;
  filters: FilterState;
};

function toUrlSearchParams(input: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(input)) {
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) params.append(key, value);
    } else if (typeof rawValue === "string") {
      params.set(key, rawValue);
    }
  }
  return params;
}

function parseSupportQuery(params: URLSearchParams): SupportQuery {
  return {
    table: parseTableQuery(params, {
      defaultPageSize: 25,
      maxPageSize: 100,
      maxSearchLength: 120,
      allowedSorts: [],
    }),
    filters: parseFilterState(params, filterRules),
  };
}

function filterValue(query: SupportQuery, key: keyof typeof filterRules): string | undefined {
  return query.filters[key]?.[0];
}

function toApiParams(query: SupportQuery): URLSearchParams {
  const params = toTableSearchParams(query.table);
  for (const key of Object.keys(filterRules) as Array<keyof typeof filterRules>) {
    const value = filterValue(query, key);
    if (value) params.set(key, value);
  }
  return params;
}

function pageHref(query: SupportQuery, page: number): string {
  const params = toTableSearchParams({ ...query.table, page: Math.max(1, page) });
  for (const key of Object.keys(filterRules) as Array<keyof typeof filterRules>) {
    const value = filterValue(query, key);
    if (value) params.set(`filter.${key}`, value);
  }
  return `/support?${params.toString()}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function shortId(value: string): string {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function QueueIdentity({ row }: { row: SupportTicketQueueItem }) {
  return (
    <div className="support-queue__ticket">
      <div className="support-queue__ticket-top">
        <strong>#{row.ticketNumber.toLocaleString("fa-IR", { useGrouping: false })}</strong>
        <span>{row.category}</span>
      </div>
      {row.summary ? (
        <p>
          <span aria-hidden="true">✦</span> خلاصه بازبینی‌شده: {row.summary}
        </p>
      ) : (
        <small>خلاصه امنی برای صف ثبت نشده است.</small>
      )}
    </div>
  );
}

function Requester({ row }: { row: SupportTicketQueueItem }) {
  return (
    <div className="support-queue__person">
      <strong>{row.requesterDisplayName || "—"}</strong>
      <code title={row.requesterAccountId}>{shortId(row.requesterAccountId)}</code>
    </div>
  );
}

function SlaIndicator({ row }: { row: SupportTicketQueueItem }) {
  return (
    <div className="support-queue__sla" data-sla={row.slaState}>
      <span className="support-queue__sla-label">
        <span className="support-queue__sla-dot" aria-hidden="true" />
        {slaLabels[row.slaState]}
      </span>
      <small>{row.nextDueAtUtc ? `سررسید: ${formatDateTime(row.nextDueAtUtc)}` : "بدون سررسید فعال"}</small>
    </div>
  );
}

const columns: readonly AdminTableColumn<SupportTicketQueueItem>[] = [
  {
    key: "ticket",
    header: "تیکت",
    render: (row) => <QueueIdentity row={row} />,
  },
  {
    key: "requester",
    header: "کاربر",
    render: (row) => <Requester row={row} />,
  },
  {
    key: "product",
    header: "محصول",
    render: (row) =>
      row.productCode ? (
        <span className="support-queue__product">
          {productLabels[row.productCode.toLowerCase()] ?? row.productCode}
        </span>
      ) : null,
  },
  {
    key: "priority",
    header: "اولویت",
    render: (row) => (
      <span className="support-queue__priority" data-priority={row.priority}>
        {priorityLabels[row.priority] ?? row.priority}
      </span>
    ),
  },
  {
    key: "status",
    header: "وضعیت",
    render: (row) => (
      <span className="support-queue__status" data-status={row.status}>
        {statusLabels[row.status] ?? row.status}
      </span>
    ),
  },
  {
    key: "sla",
    header: "SLA",
    render: (row) => <SlaIndicator row={row} />,
  },
  {
    key: "assignee",
    header: "مسئول",
    render: (row) => (
      <div className="support-queue__assignee">
        <strong>{row.assigneeDisplayName || "تخصیص‌نیافته"}</strong>
        {row.assignedAdminAccountId ? <code>{shortId(row.assignedAdminAccountId)}</code> : null}
      </div>
    ),
  },
  {
    key: "activity",
    header: "آخرین فعالیت",
    render: (row) => formatDateTime(row.lastActivityAtUtc),
  },
  {
    key: "detail",
    header: "جزئیات",
    render: (row) => (
      <Link className="support-queue__detail-link" href={`/support/${row.ticketId}`}>
        مشاهده تیکت
      </Link>
    ),
  },
];

function SupportHero() {
  return (
    <section className="support-queue__hero" aria-labelledby="support-queue-title">
      <div>
        <span>LifeMate Care Operations</span>
        <h2 id="support-queue-title">صف پشتیبانی، بدون شلوغی و افشای اضافه</h2>
        <p>
          اولویت، SLA و مسئول هر تیکت کنار هم دیده می‌شود؛ متن خام گفتگو، اطلاعات تماس و داده سلامت
          وارد این نما نمی‌شوند.
        </p>
      </div>
      <div className="support-queue__hero-badges" aria-label="ویژگی‌های صف">
        <span>Server paginated</span>
        <span>Privacy minimized</span>
        <span>SLA aware</span>
      </div>
    </section>
  );
}

function SupportFilterBar({ query }: { query: SupportQuery }) {
  return (
    <AdminTableFilterBar action="/support" clearHref="/support" ariaLabel="فیلتر صف پشتیبانی">
      <input type="hidden" name="page" value="1" />
      <div className="admin-list-filter admin-list-filter--search">
        <label htmlFor="support-search">جست‌وجو</label>
        <input
          id="support-search"
          name="q"
          type="search"
          minLength={2}
          maxLength={120}
          defaultValue={query.table.search ?? ""}
          placeholder="شماره تیکت، نام یا خلاصه امن"
          autoComplete="off"
        />
      </div>
      <div className="admin-list-filter">
        <label htmlFor="support-status">وضعیت</label>
        <select id="support-status" name="filter.status" defaultValue={filterValue(query, "status") ?? ""}>
          <option value="">همه</option>
          <option value="Open">باز</option>
          <option value="Pending">در انتظار بررسی</option>
          <option value="WaitingOnUser">منتظر کاربر</option>
          <option value="Resolved">حل‌شده</option>
          <option value="Closed">بسته</option>
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="support-priority">اولویت</label>
        <select id="support-priority" name="filter.priority" defaultValue={filterValue(query, "priority") ?? ""}>
          <option value="">همه</option>
          <option value="Urgent">فوری</option>
          <option value="High">بالا</option>
          <option value="Normal">عادی</option>
          <option value="Low">پایین</option>
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="support-sla">SLA</label>
        <select id="support-sla" name="filter.sla" defaultValue={filterValue(query, "sla") ?? ""}>
          <option value="">همه</option>
          <option value="Breached">نقض‌شده</option>
          <option value="DueSoon">نزدیک سررسید</option>
          <option value="OnTrack">در مسیر</option>
          <option value="Completed">تکمیل‌شده</option>
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="support-product">محصول</label>
        <select id="support-product" name="filter.product" defaultValue={filterValue(query, "product") ?? ""}>
          <option value="">همه</option>
          <option value="wellmate">WellMate</option>
          <option value="caremate">CareMate</option>
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="support-assignee">مسئول</label>
        <select id="support-assignee" name="filter.assignee" defaultValue={filterValue(query, "assignee") ?? ""}>
          <option value="">همه</option>
          <option value="unassigned">فقط تخصیص‌نیافته</option>
        </select>
      </div>
      <div className="admin-list-filter admin-list-filter--compact">
        <label htmlFor="support-page-size">تعداد در صفحه</label>
        <select id="support-page-size" name="pageSize" defaultValue={String(query.table.pageSize)}>
          <option value="25">۲۵</option>
          <option value="50">۵۰</option>
          <option value="100">۱۰۰</option>
        </select>
      </div>
    </AdminTableFilterBar>
  );
}

async function SupportQueueContent({ query }: { query: SupportQuery }) {
  const result = await getSupportQueue(toApiParams(query));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="فیلتر صف پشتیبانی معتبر نیست"
        description="جست‌وجو باید حداقل دو نویسه داشته باشد و فیلترها از مقادیر مجاز انتخاب شوند."
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
    data.page * data.pageSize < data.total ? pageHref(query, data.page + 1) : undefined;

  return (
    <AdminDataTable
      title="تیکت‌های پشتیبانی"
      description="خلاصه‌ها فقط در صورت redacted بودن نمایش داده می‌شوند؛ جزئیات گفتگو در این صف وجود ندارد."
      rows={data.items}
      columns={columns}
      rowKey={(row) => row.ticketId}
      total={data.total}
      freshness={{
        status: data.freshness.status,
        label: `آخرین دریافت: ${formatDateTime(data.freshness.asOfUtc)}`,
      }}
      pagination={{
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        previousHref,
        nextHref,
      }}
    />
  );
}

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const admin = await requireAdminAccess();
  const query = parseSupportQuery(toUrlSearchParams(await searchParams));
  const canReadSupport = admin.permissions.includes("support.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="support"
        title="پشتیبانی"
        subtitle="صف عملیاتی تیکت‌ها با اولویت، SLA و حداقل داده لازم"
      >
        <div className="support-queue">
          <SupportHero />
          <SupportFilterBar query={query} />
          {!canReadSupport ? (
            <AdminPageState state="forbidden" />
          ) : (
            <Suspense fallback={<AdminPageState state="loading" title="در حال دریافت صف پشتیبانی" />}>
              <SupportQueueContent query={query} />
            </Suspense>
          )}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
