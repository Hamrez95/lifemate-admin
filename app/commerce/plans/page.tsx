import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  AdminDataTable,
  AdminPageState,
  type AdminTableColumn,
} from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCommerceOverview,
  type CommercePlanDistribution,
  type CommerceOverviewResponse,
} from "@/src/lib/admin-api/commerce-overview";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { PlanCreateForm } from "./PlanCreateForm";
import styles from "./catalog.module.css";

const statusLabels: Record<string, string> = {
  Active: "فعال",
  Retired: "بازنشسته",
};

const columns: readonly AdminTableColumn<CommercePlanDistribution>[] = [
  {
    key: "product",
    header: "محصول",
    render: (row) => (
      <div className={styles.tableName}>
        <strong>{row.productName}</strong>
        <code>{row.productCode}</code>
      </div>
    ),
  },
  {
    key: "plan",
    header: "پلن",
    render: (row) => (
      <div className={styles.tableName}>
        <strong>{row.planName}</strong>
        <code>{row.planCode}</code>
      </div>
    ),
  },
  {
    key: "status",
    header: "وضعیت فروش",
    render: (row) => (
      <span className={styles.statusBadge} data-status={row.planStatus}>
        {statusLabels[row.planStatus] ?? row.planStatus}
      </span>
    ),
  },
  {
    key: "subscriptions",
    header: "Subscription",
    render: (row) => row.subscriptions.toLocaleString("fa-IR"),
  },
  {
    key: "active-subscriptions",
    header: "فعال / Trial / PastDue",
    render: (row) => row.activeSubscriptions.toLocaleString("fa-IR"),
  },
  {
    key: "manage",
    header: "مدیریت",
    render: (row) => (
      <Link className={styles.secondaryLink} href={`/commerce/plans/${row.planId}/manage`}>
        قیمت و lifecycle
      </Link>
    ),
  },
];

function Summary({ data }: { data: CommerceOverviewResponse }) {
  const total = data.planDistribution.length;
  const active = data.planDistribution.filter((plan) => plan.planStatus === "Active").length;
  const retired = data.planDistribution.filter((plan) => plan.planStatus === "Retired").length;
  const sellableProducts = data.products.filter((product) => product.status === "Active").length;

  return (
    <section className={styles.summaryGrid} aria-label="خلاصه کاتالوگ فروش">
      {[
        ["کل پلن‌ها", total],
        ["پلن فعال", active],
        ["پلن Retired", retired],
        ["محصول قابل فروش", sellableProducts],
      ].map(([label, value]) => (
        <article className={styles.summaryCard} key={label}>
          <span>{label}</span>
          <strong>{Number(value).toLocaleString("fa-IR")}</strong>
        </article>
      ))}
    </section>
  );
}

async function PlansContent({ canPlanWrite }: { canPlanWrite: boolean }) {
  const result = await getCommerceOverview(new URLSearchParams({ page: "1", pageSize: "25" }));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return <AdminPageState state="error" title="درخواست کاتالوگ معتبر نیست" />;
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
  return (
    <div className={styles.page} dir="rtl">
      <section className={styles.hero} aria-labelledby="commerce-plans-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Commerce · Monetization Control Plane</span>
          <h2 id="commerce-plans-title">پلن و قیمت فروش را بدون دست‌کاری تاریخچه مدیریت کن</h2>
          <p>
            Plan هویت تجاری محصول است و Price یک نسخه زمان‌دار. تغییر قیمت، مبلغ قبلی یا
            Subscription موجود را overwrite نمی‌کند؛ همه mutationها دلیل، idempotency و Audit دارند.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.secondaryLink} href="/commerce">
              نمای فروش و تجارت
            </Link>
            <Link className={styles.secondaryLink} href="/commerce/promotions">
              پروموشن و کد تخفیف
            </Link>
          </div>
        </div>
        <span className={styles.safetyBadge}>AAL2 · RBAC · Audit</span>
      </section>

      <Summary data={data} />
      <PlanCreateForm products={data.products} canWrite={canPlanWrite} />
      <AdminDataTable
        title="کاتالوگ پلن‌ها"
        description="پلن‌های بدون Subscriber نیز نمایش داده می‌شوند. برای قیمت و lifecycle وارد مدیریت هر پلن شوید."
        rows={data.planDistribution}
        columns={columns}
        rowKey={(row) => row.planId}
        total={data.planDistribution.length}
        freshness={{
          status: data.freshness.status,
          label: `Snapshot: ${new Date(data.freshness.asOfUtc).toLocaleString("fa-IR")}`,
        }}
      />
      <p className={styles.safetyNote}>
        Trial، Entitlement assignment و bulk Discount Code فقط بعد از قرارداد canonical مربوط به
        خودشان فعال می‌شوند؛ این صفحه داده یا قابلیت جعلی نمی‌سازد.
      </p>
    </div>
  );
}

export default async function CommercePlansPage() {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("commerce.read");
  const canPlanWrite = admin.permissions.includes("commerce.plan.write");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="پلن‌ها و قیمت‌گذاری"
        subtitle="کنترل امن Monetization برای اکوسیستم LifeMate"
      >
        {!canRead ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense
            fallback={<AdminPageState state="loading" title="در حال دریافت کاتالوگ فروش" />}
          >
            <PlansContent canPlanWrite={canPlanWrite} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
