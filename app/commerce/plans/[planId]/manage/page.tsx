import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getCommercePlanDetail } from "@/src/lib/admin-api/commerce-detail";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { PlanCatalogControls } from "../PlanCatalogControls";
import styles from "../../catalog.module.css";

type PageProps = {
  params: Promise<{ planId: string }>;
};

async function ManagementContent({
  planId,
  canPlanWrite,
  canPriceWrite,
}: {
  planId: string;
  canPlanWrite: boolean;
  canPriceWrite: boolean;
}) {
  const result = await getCommercePlanDetail(
    planId,
    new URLSearchParams({ page: "1", pageSize: "1" }),
  );
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "not_found") notFound();
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return <AdminPageState state="error" title="شناسه پلن معتبر نیست" />;
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
      <section className={styles.hero} aria-labelledby="plan-management-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Commerce · Plan Control</span>
          <h2 id="plan-management-title">{data.plan.name}</h2>
          <p>
            کد پایدار <span className={styles.code}>{data.plan.code}</span> برای محصول{" "}
            {data.product.name}. این سطح فقط lifecycle و نسخه جدید قیمت را تغییر می‌دهد و
            Subscription موجود را دست‌کاری نمی‌کند.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.secondaryLink} href={`/commerce/plans/${planId}`}>
              جزئیات و تاریخچه
            </Link>
            <Link className={styles.secondaryLink} href="/commerce/plans">
              همه پلن‌ها
            </Link>
          </div>
        </div>
        <span className={styles.statusBadge} data-status={data.plan.status}>
          {data.plan.status === "Active" ? "فعال" : "بازنشسته"}
        </span>
      </section>

      <PlanCatalogControls
        plan={data.plan}
        productStatus={data.product.status}
        canPlanWrite={canPlanWrite}
        canPriceWrite={canPriceWrite}
      />

      <p className={styles.safetyNote}>
        این نسخه عمداً reprice کردن Subscription موجود، Trial policy و Entitlement assignment را
        انجام نمی‌دهد. هرکدام فقط بعد از قرارداد canonical و سیاست migration مستقل فعال می‌شوند.
      </p>
    </div>
  );
}

export default async function CommercePlanManagePage({ params }: PageProps) {
  const admin = await requireAdminAccess();
  const { planId } = await params;
  const canRead = admin.permissions.includes("commerce.read");
  const canPlanWrite = admin.permissions.includes("commerce.plan.write");
  const canPriceWrite = admin.permissions.includes("commerce.price.write");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="مدیریت پلن و قیمت"
        subtitle="Lifecycle و price versioning با Audit و RBAC"
      >
        {!canRead ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense fallback={<AdminPageState state="loading" title="در حال دریافت پلن" />}>
            <ManagementContent
              planId={planId}
              canPlanWrite={canPlanWrite}
              canPriceWrite={canPriceWrite}
            />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
