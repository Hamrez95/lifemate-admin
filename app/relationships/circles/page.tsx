import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPageState, AdminPagination } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCircleDirectory,
  type CircleDirectoryItem,
  type CircleKind,
} from "@/src/lib/admin-api/circles";
import { requireAdminAccess } from "@/src/lib/admin-api/server";
import { formatPersianDateTime } from "@/src/lib/time-zone";

import referenceStyles from "../relationships-reference.module.css";
import styles from "../relationships.module.css";

type CircleDirectoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const kindLabels: Record<CircleKind, string> = {
  women_health_planning: "Women Health Planning",
  family: "Family",
  care: "Care",
  pregnancy_support: "Pregnancy Support",
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function filtersFrom(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const key of [
    "page",
    "pageSize",
    "status",
    "kind",
    "ownerPersonId",
    "memberPersonId",
    "q",
  ] as const) {
    const value = one(input[key]).trim();
    if (value) params.set(key, value);
  }
  return params;
}

function pageHref(filters: URLSearchParams, page: number): string {
  const next = new URLSearchParams(filters);
  next.set("page", String(page));
  return `/relationships/circles?${next.toString()}`;
}

function CircleTabs() {
  return (
    <nav className={referenceStyles.tabs} aria-label="بخش‌های روابط و Circle">
      <Link href="/relationships?kind=relationship">روابط</Link>
      <Link href="/relationships?kind=access_grant">مجوزهای دسترسی</Link>
      <Link href="/relationships?kind=consent">رضایت‌ها</Link>
      <Link href="/relationships/circles" data-active="true">
        Circleها
      </Link>
      <Link href="/relationships/ledger">تاریخچه و فعالیت‌ها</Link>
    </nav>
  );
}

function CircleItem({ item }: { item: CircleDirectoryItem }) {
  return (
    <article className={styles.activityItem}>
      <div className={styles.activityIcon} aria-hidden="true">
        ◌
      </div>
      <div className={styles.activityBody}>
        <div className={styles.activityTopline}>
          <div>
            <span className={styles.kindLabel}>{kindLabels[item.kind]}</span>
            <strong>{item.name}</strong>
          </div>
          <span className={styles.statusBadge} data-status={item.status}>
            {item.status === "active" ? "فعال" : "بسته"}
          </span>
        </div>
        <p>
          Owner: {item.ownerDisplayName ?? "نام نمایشی ثبت نشده"} · اعضای فعال:{" "}
          {item.activeMemberCount.toLocaleString("fa-IR")} · دعوت‌های در انتظار:{" "}
          {item.pendingInvitationCount.toLocaleString("fa-IR")}
        </p>
        <div className={styles.activityMeta}>
          <span>ایجاد: {formatPersianDateTime(item.createdAtUtc)}</span>
          <span>به‌روزرسانی: {formatPersianDateTime(item.updatedAtUtc)}</span>
          <span>نسخه: {item.version.toLocaleString("fa-IR")}</span>
          <code title="Circle ID">{item.circleId}</code>
        </div>
        <Link className={styles.ledgerHint} href={`/relationships/circles/${item.circleId}`}>
          مشاهده ساختار Circle
        </Link>
      </div>
    </article>
  );
}

async function CircleDirectoryContent({ filters }: { filters: URLSearchParams }) {
  const result = await getCircleDirectory(filters);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") {
    return (
      <AdminPageState
        state="forbidden"
        title="مجوز مشاهده Circleها وجود ندارد"
        description="برای مشاهده ساختار Circleها مجوز relationships.read لازم است."
      />
    );
  }
  if (result.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="فیلتر Circle معتبر نیست"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }
  if (result.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        title="منبع canonical Circleها در دسترس نیست"
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
          <span className={styles.eyebrow}>Circle · Structure · Privacy</span>
          <h2>Circleهای LifeMate</h2>
          <p>
            نمای عملیاتی membership، invitation و sharing mode. این صفحه داده‌های Period، Fertility،
            symptom، pain، note یا planning event را دریافت یا نمایش نمی‌دهد.
          </p>
          <div className={referenceStyles.heroChips}>
            <span>Canonical API only</span>
            <span>relationships.read</span>
            <span>Structure only</span>
          </div>
        </div>
      </section>

      <section className={referenceStyles.policyGrid} aria-label="مرزهای Circle و دسترسی سلامت">
        <article data-tone="green">
          <span className={referenceStyles.policyIcon} aria-hidden="true">
            ✓
          </span>
          <div>
            <strong>Membership ≠ Health Permission</strong>
            <p>عضویت در Circle هیچ Access Grant یا Consent پزشکی ایجاد نمی‌کند.</p>
          </div>
        </article>
        <article data-tone="blue">
          <span className={referenceStyles.policyIcon} aria-hidden="true">
            ◌
          </span>
          <div>
            <strong>Sharing mode فقط metadata ساختاری است</strong>
            <p>محتوای Women Health و eventهای planning از این read model حذف شده‌اند.</p>
          </div>
        </article>
      </section>

      <CircleTabs />

      <section className={styles.filterCard} aria-labelledby="circle-filters-title">
        <div>
          <span className={styles.eyebrow}>Directory filters</span>
          <h3 id="circle-filters-title">فیلتر Circleهای canonical</h3>
          <p>جست‌وجو فقط روی نام Circle یا نام نمایشی Owner انجام می‌شود.</p>
        </div>
        <form className={styles.filters} method="get">
          <label>
            <span>نوع Circle</span>
            <select name="kind" defaultValue={data.filters.kind ?? ""}>
              <option value="">همه انواع</option>
              <option value="women_health_planning">Women Health Planning</option>
              <option value="family">Family</option>
              <option value="care">Care</option>
              <option value="pregnancy_support">Pregnancy Support</option>
            </select>
          </label>
          <label>
            <span>وضعیت</span>
            <select name="status" defaultValue={data.filters.status ?? ""}>
              <option value="">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="closed">بسته</option>
            </select>
          </label>
          <label>
            <span>جست‌وجو</span>
            <input name="q" minLength={2} maxLength={80} defaultValue={data.filters.q ?? ""} />
          </label>
          <label>
            <span>Owner Person ID</span>
            <input name="ownerPersonId" defaultValue={data.filters.ownerPersonId ?? ""} />
          </label>
          <label>
            <span>Member Person ID</span>
            <input name="memberPersonId" defaultValue={data.filters.memberPersonId ?? ""} />
          </label>
          <input type="hidden" name="pageSize" value={data.pageSize} />
          <button type="submit">اعمال فیلتر</button>
        </form>
      </section>

      <section className={styles.activityCard} aria-labelledby="circle-directory-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Canonical Circle records</span>
            <h3 id="circle-directory-title">ساختار Circleها</h3>
            <p>
              {data.total.toLocaleString("fa-IR")} Circle مطابق فیلتر · تازه‌سازی:{" "}
              {formatPersianDateTime(data.freshness.asOfUtc)}
            </p>
          </div>
        </div>

        {data.items.length === 0 ? (
          <AdminPageState
            state="empty"
            title="Circleای با این فیلتر پیدا نشد"
            description="داده جایگزین یا نمونه ساختگی نمایش داده نمی‌شود."
          />
        ) : (
          <div className={styles.activityList}>
            {data.items.map((item) => (
              <CircleItem key={item.circleId} item={item} />
            ))}
          </div>
        )}

        <AdminPagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          previousHref={previousHref}
          nextHref={nextHref}
          ariaLabel="صفحه‌بندی Circleها"
        />
      </section>
    </div>
  );
}

export default async function CircleDirectoryPage({ searchParams }: CircleDirectoryPageProps) {
  const admin = await requireAdminAccess();
  const canReadRelationships = admin.permissions.includes("relationships.read");
  const filters = filtersFrom(await searchParams);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="relationships"
        title="Circleهای روابط"
        subtitle="ساختار عضویت، دعوت و sharing mode بدون افشای داده‌های حساس Women Health"
      >
        {!canReadRelationships ? (
          <AdminPageState
            state="forbidden"
            title="مجوز ورود به Circleها وجود ندارد"
            description="برای مشاهده این workspace مجوز relationships.read لازم است."
          />
        ) : (
          <Suspense
            fallback={
              <AdminPageState
                state="loading"
                title="در حال دریافت Circleها"
                description="داده فقط از Admin API canonical بارگذاری می‌شود."
              />
            }
          >
            <CircleDirectoryContent filters={filters} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
