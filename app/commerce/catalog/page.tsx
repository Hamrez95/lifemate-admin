import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCommerceCatalogV2,
  type CommerceCatalogPolicy,
  type CommerceCatalogPrice,
} from "@/src/lib/admin-api/commerce-catalog-v2";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import {
  CommerceDependencyGrid,
  CommerceWorkspaceHeader,
  CoreDependencyNotice,
} from "../CommerceWorkspaceHeader";
import styles from "./catalog-v2.module.css";

function Price({ price }: { price: CommerceCatalogPrice | null }) {
  if (!price) return <span className={styles.meta}>قیمت فعال ثبت نشده</span>;
  return (
    <div className={styles.price} title="مبلغ به minor unit ذخیره‌شده نمایش داده می‌شود؛ UI نرخ ارز یا decimal را حدس نمی‌زند.">
      {price.amountMinor} minor · {price.currency} · {price.storeProvider}
      {price.countryCode ? ` · ${price.countryCode}` : ""}
    </div>
  );
}

function Policy({ policy }: { policy: CommerceCatalogPolicy }) {
  const value = JSON.stringify(policy.value);
  return (
    <li className={styles.policy}>
      <strong>{policy.key}</strong>
      <span className={styles.meta}>
        {policy.valueType} · v{policy.version.toLocaleString("fa-IR")}
      </span>
      <code className={styles.policyValue}>{value}</code>
    </li>
  );
}

async function CatalogContent() {
  const result = await getCommerceCatalogV2();
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return <AdminPageState state="error" title="درخواست کاتالوگ معتبر نیست" />;
  }
  if (result.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        title="کاتالوگ اکوسیستم فعلاً در دسترس نیست"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }

  const { data } = result;
  return (
    <div className={styles.page} dir="rtl">
      <CommerceWorkspaceHeader
        active="catalog"
        eyebrow={`Commerce Catalog v2 · ${data.version}`}
        title="محصول، Offer، Bundle و Free Tier از یک منبع canonical"
        description="این نما مستقیماً قرارداد Core #486 را مصرف می‌کند. Product، Offer، قیمت نسخه‌دار، Bundle و policyهای Free Tier در UI بازسازی یا hardcode نمی‌شوند."
        badges={["Core #486", "commerce.read", "Server-only", "No inferred pricing"]}
      />

      <CommerceDependencyGrid>
        <CoreDependencyNotice title="Product → Offer → Versioned Price" tone="available">
          کاتالوگ v2 و قیمت فعال هر Offer از Core خوانده می‌شود؛ قیمت Subscriptionهای قبلی بازنویسی نمی‌شود.
        </CoreDependencyNotice>
        <CoreDependencyNotice title="Bundle + Gift eligibility" tone="available">
          ترکیب Bundle و gift eligibility از مدل canonical نمایش داده می‌شود و از نام محصول یا UI استنتاج نمی‌شود.
        </CoreDependencyNotice>
        <CoreDependencyNotice title="Mutationهای v2" tone="info">
          Core فعلاً برای Product/Offer/Bundle v2 قرارداد read canonical دارد. تا زمانی که mutation versioned و audited منتشر نشود، این صفحه edit ساختگی یا direct DB write ارائه نمی‌کند.
        </CoreDependencyNotice>
      </CommerceDependencyGrid>

      <div className={styles.toolbar}>
        <strong>کاتالوگ Published</strong>
        <span className={styles.freshness}>
          {data.freshness.status === "fresh" ? "تازه" : "قدیمی"} · {new Date(data.freshness.asOfUtc).toLocaleString("fa-IR")}
        </span>
      </div>

      {data.products.length === 0 ? (
        <div className={styles.empty}>هیچ Product منتشرشده‌ای در قرارداد canonical وجود ندارد.</div>
      ) : (
        <section className={styles.grid} aria-label="محصولات اکوسیستم">
          {data.products.map((product) => (
            <article className={styles.card} key={product.id}>
              <header className={styles.cardHeader}>
                <div>
                  <h3>{product.name}</h3>
                  <code className={styles.code}>{product.code}</code>
                </div>
                <span className={styles.status}>{product.status}</span>
              </header>

              <h4 className={styles.sectionTitle}>Offerها</h4>
              {product.offers.length === 0 ? (
                <div className={styles.empty}>Offer منتشرشده ندارد.</div>
              ) : (
                <ul className={styles.list}>
                  {product.offers.map((offer) => (
                    <li className={styles.offer} key={offer.id}>
                      <div className={styles.offerTop}>
                        <span className={styles.offerName}>{offer.name}</span>
                        <span>{offer.durationMonths.toLocaleString("fa-IR")} ماه</span>
                      </div>
                      <code className={styles.code}>{offer.code}</code>
                      <div className={styles.meta}>
                        <span>{offer.status}</span>
                        <span>v{offer.version.toLocaleString("fa-IR")}</span>
                        <span>{offer.giftEligible ? "Gift ✓" : "Gift —"}</span>
                      </div>
                      <Price price={offer.price} />
                    </li>
                  ))}
                </ul>
              )}

              <h4 className={styles.sectionTitle}>Policy / Free Tier</h4>
              {product.policies.length === 0 ? (
                <div className={styles.empty}>policy فعالی ثبت نشده است.</div>
              ) : (
                <ul className={styles.list}>{product.policies.map((policy) => <Policy key={`${policy.key}-${policy.version}`} policy={policy} />)}</ul>
              )}
            </article>
          ))}
        </section>
      )}

      <section aria-labelledby="catalog-bundles-title">
        <h2 id="catalog-bundles-title">Bundleها</h2>
        {data.bundles.length === 0 ? (
          <div className={styles.empty}>Bundle منتشرشده‌ای وجود ندارد.</div>
        ) : (
          <div className={styles.bundleGrid}>
            {data.bundles.map((bundle) => (
              <article className={styles.bundle} key={bundle.id}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3>{bundle.name}</h3>
                    <code className={styles.code}>{bundle.code}</code>
                  </div>
                  <span className={styles.status}>{bundle.status}</span>
                </div>
                <div className={styles.meta}>
                  <span>v{bundle.version.toLocaleString("fa-IR")}</span>
                  <span>{bundle.giftEligible ? "Gift ✓" : "Gift —"}</span>
                </div>
                <ul className={styles.list}>
                  {bundle.items.map((item) => (
                    <li className={styles.bundleItem} key={`${bundle.id}-${item.offerId}`}>
                      <code>{item.offerCode}</code>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className={styles.notice}>
        مبلغ‌ها عمداً به همان minor unit ثبت‌شده نمایش داده می‌شوند. این UI تعداد decimal، FX، revenue یا ارزش مالی Bundle را حدس نمی‌زند. mutationهای Product/Offer/Bundle نیز تا وجود API canonical فعال نمی‌شوند.
      </p>
    </div>
  );
}

export default async function CommerceCatalogPage() {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("commerce.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="کاتالوگ اکوسیستم"
        subtitle="Product، Offer، Bundle، قیمت نسخه‌دار و Free Tier"
      >
        {canRead ? <CatalogContent /> : <AdminPageState state="forbidden" />}
      </AdminShell>
    </AdminSessionProvider>
  );
}
