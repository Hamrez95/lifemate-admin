import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCommercePromotionDetail,
  getCommercePromotions,
  type CommercePromotionDetail,
  type PromotionStatus,
} from "@/src/lib/admin-api/commerce-promotions";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { PromotionOperations } from "./PromotionOperations";
import styles from "../promotions.module.css";

type PromotionDetailPageProps = {
  params: Promise<{ promotionId: string }>;
};

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const statusLabels: Record<PromotionStatus, string> = {
  Draft: "پیش‌نویس",
  Active: "فعال",
  Paused: "متوقف",
  Expired: "منقضی",
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function formatDiscount(data: CommercePromotionDetail): string {
  const discount = data.promotion.discount;
  if (discount.type === "Percentage") {
    return discount.percentageBasisPoints == null
      ? "—"
      : `${(discount.percentageBasisPoints / 100).toLocaleString("fa-IR")}٪`;
  }
  if (!discount.fixedAmountMinor || !discount.currency) return "—";
  try {
    return `${BigInt(discount.fixedAmountMinor).toLocaleString("fa-IR")} ${discount.currency}`;
  } catch {
    return "—";
  }
}

function DetailHero({ data }: { data: CommercePromotionDetail }) {
  const promotion = data.promotion;
  return (
    <section className={styles.detailHero} aria-labelledby="promotion-detail-title">
      <div>
        <span className={styles.eyebrow}>Promotion Detail · Audited</span>
        <h2 id="promotion-detail-title">{promotion.name}</h2>
        <p>
          Rule تجاری، کدهای استفاده و lifecycle جدا نمایش داده می‌شوند. هیچ اطلاعات کارت یا provider
          reference در این صفحه وجود ندارد.
        </p>
        <div className={styles.detailHeroActions}>
          <Link href="/commerce/promotions" className={styles.secondaryAction}>
            بازگشت به پروموشن‌ها
          </Link>
          <code>{promotion.promotionId}</code>
        </div>
      </div>
      <div className={styles.detailStatusCard}>
        <span>Effective status</span>
        <strong data-status={promotion.effectiveStatus}>
          {statusLabels[promotion.effectiveStatus]}
        </strong>
        <small>Stored: {statusLabels[promotion.storedStatus]}</small>
      </div>
    </section>
  );
}

function Facts({ data }: { data: CommercePromotionDetail }) {
  const promotion = data.promotion;
  const facts = [
    ["محصول", promotion.product ? `${promotion.product.name} · ${promotion.product.code}` : "همه محصولات"],
    ["تخفیف", formatDiscount(data)],
    ["شروع", formatDateTime(promotion.startsAtUtc)],
    ["پایان", formatDateTime(promotion.endsAtUtc)],
    ["سقف استفاده", promotion.maxRedemptions?.toLocaleString("fa-IR") ?? "نامحدود"],
    ["Redemption", "— · منبع canonical هنوز instrument نشده"],
  ];
  return (
    <section className={styles.factGrid} aria-label="مشخصات پروموشن">
      {facts.map(([label, value]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function Codes({ data }: { data: CommercePromotionDetail }) {
  return (
    <section className={styles.detailPanel} aria-labelledby="promotion-codes-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Discount Codes</span>
          <h3 id="promotion-codes-title">کدهای متصل به Rule</h3>
          <p>
            نمایش کامل کد فقط در این مسیر جزئیات با شناسه داخلی انجام می‌شود؛ لیست عمومی Admin کد را
            mask می‌کند.
          </p>
        </div>
      </div>
      {data.codes.length === 0 ? (
        <AdminPageState state="empty" title="کد تخفیفی برای این پروموشن وجود ندارد" />
      ) : (
        <div className={styles.codeCards}>
          {data.codes.map((code) => (
            <article key={code.codeId}>
              <div>
                <code dir="ltr">{code.code}</code>
                <span className={styles.statusBadge} data-status={code.status}>
                  {code.status === "Active" ? "فعال" : "غیرفعال"}
                </span>
              </div>
              <dl>
                <div>
                  <dt>سقف استفاده</dt>
                  <dd>{code.maxRedemptions?.toLocaleString("fa-IR") ?? "نامحدود"}</dd>
                </div>
                <div>
                  <dt>استفاده واقعی</dt>
                  <dd title={code.redemptionSummary.reason}>— · unavailable</dd>
                </div>
                <div>
                  <dt>آخرین تغییر</dt>
                  <dd>{formatDateTime(code.updatedAtUtc)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function AuditEvidence({ data }: { data: CommercePromotionDetail }) {
  const evidence = data.auditEvidence;
  return (
    <section className={styles.detailPanel} aria-labelledby="promotion-audit-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Immutable audit evidence</span>
          <h3 id="promotion-audit-title">شواهد تغییرات</h3>
          <p>Actor identifier نمایش داده نمی‌شود؛ فقط linked state، نتیجه، دلیل و correlation دیده می‌شود.</p>
        </div>
        {evidence.state === "forbidden" ? (
          <span className={styles.permissionBadge}>security.audit.read</span>
        ) : null}
      </div>
      {evidence.state === "forbidden" ? (
        <div className={styles.safetyNote}>برای مشاهده Audit این منبع، مجوز security.audit.read لازم است.</div>
      ) : evidence.items.length === 0 ? (
        <AdminPageState state="empty" title="رخداد Audit برای این پروموشن وجود ندارد" />
      ) : (
        <div className={styles.auditList}>
          {evidence.items.map((event) => (
            <article key={event.auditEventId}>
              <div>
                <strong>{event.action}</strong>
                <span data-result={event.result}>{event.result}</span>
              </div>
              <p>{event.reason ?? "بدون دلیل متنی"}</p>
              <footer>
                <time dateTime={event.occurredAtUtc}>{formatDateTime(event.occurredAtUtc)}</time>
                <code>{event.correlationId.slice(0, 8)}…{event.correlationId.slice(-4)}</code>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

async function PromotionDetailContent({
  promotionId,
  canWrite,
}: {
  promotionId: string;
  canWrite: boolean;
}) {
  const [detailResult, listResult] = await Promise.all([
    getCommercePromotionDetail(promotionId),
    getCommercePromotions(new URLSearchParams({ page: "1", pageSize: "1" })),
  ]);
  if (detailResult.kind === "unauthenticated" || listResult.kind === "unauthenticated") {
    redirect("/login");
  }
  if (detailResult.kind === "forbidden" || listResult.kind === "forbidden") {
    return <AdminPageState state="forbidden" />;
  }
  if (detailResult.kind === "not_found") {
    return <AdminPageState state="empty" title="پروموشن پیدا نشد" />;
  }
  if (detailResult.kind === "invalid" || listResult.kind === "invalid") {
    return <AdminPageState state="error" title="پاسخ پروموشن معتبر نیست" />;
  }
  if (detailResult.kind === "unavailable" || listResult.kind === "unavailable") {
    const correlationId =
      detailResult.kind === "unavailable"
        ? detailResult.correlationId
        : listResult.kind === "unavailable"
          ? listResult.correlationId
          : undefined;
    return (
      <AdminPageState
        state="unavailable"
        description={correlationId ? `کد پیگیری: ${correlationId}` : undefined}
      />
    );
  }
  if (listResult.kind === "not_found") {
    return <AdminPageState state="unavailable" title="فهرست محصولات تجارت در دسترس نیست" />;
  }

  const data = detailResult.data;
  return (
    <div className={styles.page} dir="rtl">
      <DetailHero data={data} />
      <div className={styles.sourceStrip} data-stale={data.freshness.status === "stale"}>
        <span>{data.source.label}</span>
        <span>Snapshot: {formatDateTime(data.freshness.asOfUtc)}</span>
        <span>{data.freshness.status === "stale" ? "هشدار: داده قدیمی است" : "داده تازه"}</span>
      </div>
      <Facts data={data} />
      <Codes data={data} />
      <PromotionOperations data={data} products={listResult.data.products} canWrite={canWrite} />
      <AuditEvidence data={data} />
    </div>
  );
}

export default async function CommercePromotionDetailPage({ params }: PromotionDetailPageProps) {
  const admin = await requireAdminAccess();
  const { promotionId } = await params;
  const canRead = admin.permissions.includes("commerce.read");
  const canWrite = admin.permissions.includes("commerce.promo.write");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell activeSlug="commerce" title="جزئیات پروموشن" subtitle="Rule، Code، lifecycle و Audit">
        {!canRead ? (
          <AdminPageState state="forbidden" />
        ) : (
          <PromotionDetailContent promotionId={promotionId} canWrite={canWrite} />
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
