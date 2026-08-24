import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import "./users.css";

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
import { getUserDirectory, type UserDirectoryItem } from "@/src/lib/admin-api/user-directory";

const filterRules = {
  status: { maxValues: 1, maxValueLength: 32 },
  application: { maxValues: 1, maxValueLength: 64 },
} as const;

const statusLabels: Record<string, string> = {
  Active: "فعال",
  Disabled: "غیرفعال",
  DeletionPending: "در انتظار حذف",
};

const applicationLabels: Record<string, string> = {
  wellmate: "WellMate",
  caremate: "CareMate",
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type UsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type DirectoryQuery = {
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

function parseDirectoryQuery(params: URLSearchParams): DirectoryQuery {
  return {
    table: parseTableQuery(params, {
      defaultPageSize: 25,
      maxPageSize: 100,
      maxSearchLength: 120,
      allowedSorts: ["createdAt", "displayName", "lastActiveAt"],
    }),
    filters: parseFilterState(params, filterRules),
  };
}

function toApiParams(query: DirectoryQuery): URLSearchParams {
  const params = toTableSearchParams(query.table);
  const status = query.filters.status?.[0];
  const application = query.filters.application?.[0];
  if (status) params.set("status", status);
  if (application) params.set("application", application);
  return params;
}

function pageHref(query: DirectoryQuery, page: number): string {
  const params = toTableSearchParams({ ...query.table, page: Math.max(1, page) });
  const status = query.filters.status?.[0];
  const application = query.filters.application?.[0];
  if (status) params.set("filter.status", status);
  if (application) params.set("filter.application", application);
  return `/users?${params.toString()}`;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

function formatDateTime(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateTimeFormatter.format(date);
}

function shortId(value: string): string {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

const columns: readonly AdminTableColumn<UserDirectoryItem>[] = [
  {
    key: "identity",
    header: "کاربر",
    render: (row) => (
      <div className="user-directory__identity">
        <strong>{row.displayName || "—"}</strong>
        <code title={row.accountId}>{shortId(row.accountId)}</code>
      </div>
    ),
  },
  {
    key: "products",
    header: "محصول‌ها",
    render: (row) =>
      row.applicationCodes.length > 0 ? (
        <div className="user-directory__products">
          {row.applicationCodes.map((code) => (
            <span className="user-directory__product" key={code}>
              {applicationLabels[code.toLowerCase()] ?? code}
            </span>
          ))}
        </div>
      ) : null,
  },
  {
    key: "status",
    header: "وضعیت حساب",
    render: (row) => (
      <span className="user-directory__status" data-status={row.status}>
        {statusLabels[row.status] ?? row.status}
      </span>
    ),
  },
  {
    key: "created",
    header: "عضویت",
    render: (row) => formatDate(row.createdAtUtc),
  },
  {
    key: "activity",
    header: "آخرین فعالیت",
    render: (row) => formatDate(row.lastActiveAtUtc),
  },
  {
    key: "detail",
    header: "جزئیات",
    render: (row) => (
      <Link className="user-directory__detail-link" href={`/users/${row.accountId}`}>
        User 360
      </Link>
    ),
  },
];

function DirectoryFilterBar({ query }: { query: DirectoryQuery }) {
  const status = query.filters.status?.[0] ?? "";
  const application = query.filters.application?.[0] ?? "";

  return (
    <AdminTableFilterBar action="/users" clearHref="/users" ariaLabel="فیلتر کاربران">
      <input type="hidden" name="page" value="1" />
      <div className="admin-list-filter admin-list-filter--search">
        <label htmlFor="user-directory-search">جست‌وجوی کاربر یا حساب</label>
        <input
          id="user-directory-search"
          name="q"
          type="search"
          minLength={2}
          maxLength={120}
          defaultValue={query.table.search ?? ""}
          placeholder="نام یا شناسه مجاز در قرارداد"
          autoComplete="off"
        />
      </div>
      <div className="admin-list-filter">
        <label htmlFor="user-directory-status">وضعیت</label>
        <select id="user-directory-status" name="filter.status" defaultValue={status}>
          <option value="">همه وضعیت‌ها</option>
          <option value="Active">فعال</option>
          <option value="Disabled">غیرفعال</option>
          <option value="DeletionPending">در انتظار حذف</option>
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="user-directory-application">محصول</label>
        <select
          id="user-directory-application"
          name="filter.application"
          defaultValue={application}
        >
          <option value="">همه محصولات</option>
          <option value="wellmate">WellMate</option>
          <option value="caremate">CareMate</option>
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="user-directory-sort">مرتب‌سازی</label>
        <select id="user-directory-sort" name="sort" defaultValue={query.table.sort ?? "createdAt"}>
          <option value="createdAt">تاریخ عضویت</option>
          <option value="displayName">نام</option>
          <option value="lastActiveAt">آخرین فعالیت</option>
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="user-directory-direction">جهت</label>
        <select
          id="user-directory-direction"
          name="direction"
          defaultValue={query.table.direction ?? "desc"}
        >
          <option value="desc">نزولی</option>
          <option value="asc">صعودی</option>
        </select>
      </div>
      <div className="admin-list-filter admin-list-filter--compact">
        <label htmlFor="user-directory-page-size">تعداد در صفحه</label>
        <select
          id="user-directory-page-size"
          name="pageSize"
          defaultValue={String(query.table.pageSize)}
        >
          <option value="25">۲۵</option>
          <option value="50">۵۰</option>
          <option value="100">۱۰۰</option>
        </select>
      </div>
    </AdminTableFilterBar>
  );
}

async function DirectoryContent({ query }: { query: DirectoryQuery }) {
  const result = await getUserDirectory(toApiParams(query));

  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="فیلتر یا جست‌وجو معتبر نیست"
        description="عبارت جست‌وجو باید حداقل دو نویسه داشته باشد و فیلترها از گزینه‌های مجاز انتخاب شوند."
      />
    );
  }
  if (result.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        description={
          result.correlationId
            ? `منبع داده در دسترس نیست. کد پیگیری: ${result.correlationId}`
            : undefined
        }
      />
    );
  }

  const { data } = result;
  const previousHref = data.page > 1 ? pageHref(query, data.page - 1) : undefined;
  const nextHref =
    data.page * data.pageSize < data.total ? pageHref(query, data.page + 1) : undefined;
  const freshnessTime = formatDateTime(data.freshness.asOfUtc);

  if (data.items.length === 0) {
    return (
      <section className="user-directory__empty" aria-labelledby="user-directory-empty-title">
        <div>
          <span className="user-directory__eyebrow">Privacy-first search</span>
          <h3 id="user-directory-empty-title">کاربری با این فیلترهای مجاز پیدا نشد</h3>
          <p>
            دامنه جست‌وجو همان قرارداد canonical کاربران است. اطلاعات تماس، سلامت یا Women Health
            برای گسترش نتیجه جست‌وجو استفاده یا نمایش داده نمی‌شوند.
          </p>
        </div>
        <Image
          src="/design-assets/user-privacy-hero-v1.png"
          alt="تصویر حریم خصوصی و مدیریت امن کاربران LifeMate"
          width={720}
          height={560}
          sizes="(max-width: 720px) 74vw, 280px"
        />
      </section>
    );
  }

  return (
    <AdminDataTable
      title="فهرست کاربران"
      description="فقط اطلاعات پایه حساب و عضویت محصول نمایش داده می‌شود؛ داده‌های سلامت و اطلاعات تماس حساس در این نما وجود ندارند."
      rows={data.items}
      columns={columns}
      rowKey={(row) => row.accountId}
      total={data.total}
      freshness={{
        status: data.freshness.status,
        label: freshnessTime ? `آخرین دریافت: ${freshnessTime}` : "وضعیت تازگی نامشخص",
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

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const admin = await requireAdminAccess();
  const query = parseDirectoryQuery(toUrlSearchParams(await searchParams));
  const canReadUsers = admin.permissions.includes("users.read.basic");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="users"
        title="کاربران و حساب‌ها"
        subtitle="جست‌وجوی امن، حداقل‌سازی داده و مسیر ورود به User 360"
      >
        <div className="user-directory">
          <section className="user-directory__intro" aria-labelledby="user-directory-intro-title">
            <div className="user-directory__intro-copy">
              <span className="user-directory__eyebrow">Users · Privacy by default</span>
              <h2 id="user-directory-intro-title">
                کاربر را پیدا کن، بدون بازکردن داده‌ای که لازم نیست.
              </h2>
              <p>
                این workspace فقط read model پایه کاربران را از Admin API می‌خواند. هیچ جست‌وجوی
                مستقیم روی Supabase، اطلاعات تماس خام یا داده سلامت انجام نمی‌شود.
              </p>
              <div className="user-directory__guardrails" aria-label="مرزهای جست‌وجوی کاربر">
                <span>Canonical API only</span>
                <span>اطلاعات حساس پنهان</span>
                <span>ورود به User 360 با مجوز</span>
              </div>
            </div>
            <div className="user-directory__intro-visual">
              <Image
                src="/design-assets/user-privacy-hero-v1.png"
                alt="تصویر حریم خصوصی و جست‌وجوی امن کاربران LifeMate"
                width={720}
                height={560}
                sizes="(max-width: 720px) 72vw, 300px"
              />
            </div>
          </section>

          <aside className="user-directory__privacy-note" aria-label="سیاست حداقل‌سازی داده">
            <strong>نمایش پیش‌فرض حداقلی است.</strong>
            <span>
              فقط شناسه حساب، نام نمایشیِ مجاز، وضعیت و عضویت محصول نمایش داده می‌شود؛ این صفحه مسیر
              میان‌بر برای داده حساس ندارد.
            </span>
          </aside>

          <DirectoryFilterBar query={query} />
          {!canReadUsers ? (
            <AdminPageState state="forbidden" />
          ) : (
            <Suspense fallback={<AdminPageState state="loading" title="در حال دریافت کاربران" />}>
              <DirectoryContent query={query} />
            </Suspense>
          )}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
