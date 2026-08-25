import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getCommerceTrialPolicy } from "@/src/lib/admin-api/commerce-catalog";
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
  canTrialWrite,
}: {
  planId: string;
  canPlanWrite: boolean;
  canPriceWrite: boolean;
  canTrialWrite: boolean;
}) {
  const [planResult, trialResult] = await Promise.all([
    getCommercePlanDetail(
      planId,
      new URLSearchParams({ page: "1", pageSize: "1" }),
    ),
    getCommerceTrialPolicy(planId),
  ]);
  if (
    planResult.kind === "unauthenticated" ||
    trialResult.kind === "unauthenticated"
  ) {
    redirect("/login");
  }
  if (planResult.kind === "not_found" || trialResult.kind === "not_found") {
    notFound();
  }
  if (planResult.kind === "forbidden" || trialResult.kind === "forbidden") {
    return <AdminPageState state="forbidden" />;
  }
  if (planResult.kind === "invalid") {
    return <AdminPageState state="error" title="شناسه پلن معتبر نیست" />;
  }
  if (planResult.kind === "unavailable" || trialResult.kind === "unavailable") {
    const correlationId =
      planResult.kind === "unavailable"
        ? planResult.correlationId
        : trialResult.kind === "unavailable"
          ? trialResult.correlationId
          : undefined;
    return (
      <AdminPageState
        state="unavailable"
        description={correlationId ? `کد پیگیری: ${correlationId}` : undefined}
      />
    );
  }

  const { data } = planResult;
  return (
    <div className={styles.page} dir="rtl">
      <section className={styles.hero} aria-labelledby="plan-management-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Commerce · Plan Control</span>
          <h2 id="plan-management-title">{data.plan.name}</h2>
          <p>
            کد پایدار <span className={styles.code}>{data.plan.code}</span> برای محصول{" "}
            {data.product.name}. این سطح lifecycle، Trial policy و نسخه جدید قیمت را با contract
            canonical تغییر می‌دهد و Subscription موجود را دست‌کاری نمی‌کند.
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
        trialPolicy={trialResult.policy}
        canPlanWrite={canPlanWrite}
        canPriceWrite={canPriceWrite}
        canTrialWrite={canTrialWrite}
      />

      <p className={styles.safetyNote}>
        این نسخه عمداً reprice کردن Subscription موجود و Entitlement assignment را انجام نمی‌دهد.
        Discount-code issuance و Plan ↔ Entitlement فقط بعد از قرارداد canonical مستقل فعال می‌شوند.
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
  const canTrialWrite = admin.permissions.includes("commerce.trial.write");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="مدیریت پلن و قیمت"
        subtitle="Lifecycle، Trial policy و price versioning با Audit و RBAC"
      >
        {!canRead ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense fallback={<AdminPageState state="loading" title="در حال دریافت پلن" />}>
            <ManagementContent
              planId={planId}
              canPlanWrite={canPlanWrite}
              canPriceWrite={canPriceWrite}
              canTrialWrite={canTrialWrite}
            />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
