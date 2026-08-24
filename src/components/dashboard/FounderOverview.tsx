import Image from "next/image";
import Link from "next/link";

import type {
  ExecutiveValueState,
  FounderOverviewData,
} from "@/src/lib/admin-api/founder-overview";

import styles from "./FounderOverview.module.css";

const numberFormat = new Intl.NumberFormat("fa-IR");
const dateTimeFormat = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  dateStyle: "short",
  timeStyle: "short",
});

const sourceLabels = {
  support: "پشتیبانی",
  security: "امنیت",
  operations: "عملیات",
  finance: "مالی",
  product: "محصول",
} as const;

function stateLabel(state: ExecutiveValueState): string {
  switch (state) {
    case "ready":
      return "آماده";
    case "partial":
      return "داده جزئی";
    case "empty":
      return "بدون مورد فعال";
    case "not_instrumented":
      return "منبع متصل نیست";
    default:
      return "در دسترس نیست";
  }
}

function freshnessLabel(value: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return "زمان منبع: —";
  return `تا ${dateTimeFormat.format(new Date(value))}`;
}

function metricValue(value: number | null): string {
  return value === null ? "—" : numberFormat.format(value);
}

function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <div className={styles.emptyPanel} role="status">
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

export function FounderOverview({ data }: { data: FounderOverviewData }) {
  return (
    <div className={styles.dashboard}>
      <section className={styles.hero} aria-labelledby="founder-pulse-title">
        <div className={styles.heroCopy}>
          <p className="eyebrow">Founder Command Center</p>
          <h2 id="founder-pulse-title">پالس اجرایی LifeMate، فقط بر پایه داده قابل ردیابی.</h2>
          <p>
            این نما برای تصمیم سریع Founder ساخته شده است. هر عدد از API canonical همان حوزه می‌آید
            و نبود داده با وضعیت صریح نمایش داده می‌شود، نه با صفر یا KPI نمایشی.
          </p>
          <div className={styles.heroMeta}>
            <span className="state-pill state-pill--safe">Permission-aware</span>
            <span>{freshnessLabel(data.generatedAtUtc)}</span>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <Image
            src="/design-assets/founder-ecosystem-hero-v1.png"
            alt="تصویر مفهومی اکوسیستم LifeMate برای داشبورد Founder"
            width={1536}
            height={1024}
            sizes="(max-width: 720px) 44vw, (max-width: 1100px) 34vw, 360px"
            priority
            className={styles.heroImage}
          />
        </div>
      </section>

      <section className={styles.kpiSection} aria-labelledby="executive-metrics-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className="eyebrow">Executive metrics</p>
            <h2 id="executive-metrics-title">آنچه الان باید ببینید</h2>
          </div>
          <span className={styles.sectionHint}>منبع و freshness روی هر کارت</span>
        </div>

        {data.metrics.length > 0 ? (
          <div className={styles.metricGrid}>
            {data.metrics.map((metric) => (
              <Link className={styles.metricLink} href={metric.href} key={metric.key}>
                <article className={styles.metricCard} data-tone={metric.tone}>
                  <div className={styles.metricTopline}>
                    <span>{metric.label}</span>
                    <span className={styles.stateBadge} data-state={metric.state}>
                      {stateLabel(metric.state)}
                    </span>
                  </div>
                  <strong className={styles.metricValue}>{metricValue(metric.value)}</strong>
                  <p>{metric.note ?? metric.source}</p>
                  <span className={styles.meta}>{freshnessLabel(metric.asOfUtc)}</span>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="KPI قابل نمایش وجود ندارد."
            detail="برای این نشست، منبع canonical مجاز یا داده قابل نمایش در دسترس نیست."
          />
        )}
      </section>

      <div className={styles.monitorGrid}>
        <section className={styles.panel} aria-labelledby="priority-alerts-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Attention</p>
              <h2 id="priority-alerts-title">نیازمند توجه</h2>
            </div>
            {data.alerts ? (
              <span className={styles.stateBadge} data-state={data.alerts.state}>
                {stateLabel(data.alerts.state)}
              </span>
            ) : null}
          </div>

          {!data.alerts ? (
            <EmptyPanel
              title="هشداری برای این سطح دسترسی نمایش داده نمی‌شود."
              detail="وجود منابع غیرمجاز از Home قابل استنتاج نیست."
            />
          ) : data.alerts.items.length > 0 ? (
            <div className={styles.alertList}>
              {data.alerts.items.slice(0, 6).map((alert) => {
                const body = (
                  <>
                    <div className={styles.alertTop}>
                      <strong>{alert.title}</strong>
                      <span>{sourceLabels[alert.source]}</span>
                    </div>
                    <p>{alert.summary ?? "جزئیات بیشتر در منبع همین حوزه موجود است."}</p>
                    <span className={styles.meta}>{freshnessLabel(alert.freshnessAtUtc)}</span>
                  </>
                );
                return alert.deepLink ? (
                  <Link
                    className={styles.alertCard}
                    data-severity={alert.severity}
                    href={alert.deepLink}
                    key={alert.alertKey}
                  >
                    {body}
                  </Link>
                ) : (
                  <article
                    className={styles.alertCard}
                    data-severity={alert.severity}
                    key={alert.alertKey}
                  >
                    {body}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyPanel
              title={
                data.alerts.state === "unavailable"
                  ? "منبع هشدار در دسترس نیست."
                  : "هشدار فعالی ثبت نشده است."
              }
              detail={freshnessLabel(data.alerts.asOfUtc)}
            />
          )}

          {data.alerts?.sources.length ? (
            <div className={styles.sourceStrip} aria-label="وضعیت منابع هشدار">
              {data.alerts.sources.map((source) => (
                <div className={styles.sourceItem} key={source.source}>
                  <span>{sourceLabels[source.source]}</span>
                  <strong>
                    {source.unreadCount === null ? "—" : numberFormat.format(source.unreadCount)}
                  </strong>
                  <small>{stateLabel(source.state)}</small>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className={styles.panel} aria-labelledby="activity-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Recent activity</p>
              <h2 id="activity-title">فعالیت‌های اخیر</h2>
            </div>
            {data.activity ? (
              <span className={styles.stateBadge} data-state={data.activity.state}>
                {stateLabel(data.activity.state)}
              </span>
            ) : null}
          </div>

          {!data.activity ? (
            <EmptyPanel
              title="فعالیت مدیریتی برای این سطح دسترسی نمایش داده نمی‌شود."
              detail="این بخش فقط از Audit API canonical و permission امنیتی تغذیه می‌شود."
            />
          ) : data.activity.items.length > 0 ? (
            <div className={styles.activityList}>
              {data.activity.items.map((item) => (
                <article className={styles.activityItem} key={item.id}>
                  <div>
                    <strong>{item.action}</strong>
                    <span>{item.resourceType}</span>
                  </div>
                  <div className={styles.activityMeta}>
                    <span>{item.result}</span>
                    {item.elevatedAccess ? <span className={styles.elevated}>Elevated</span> : null}
                    <time dateTime={item.occurredAtUtc}>{freshnessLabel(item.occurredAtUtc)}</time>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyPanel
              title={
                data.activity.state === "unavailable"
                  ? "Audit API در دسترس نیست."
                  : "فعالیت اخیری ثبت نشده است."
              }
              detail={freshnessLabel(data.activity.asOfUtc)}
            />
          )}
        </section>
      </div>

      <div className={styles.monitorGrid}>
        <section className={styles.panel} aria-labelledby="products-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Product & commerce</p>
              <h2 id="products-title">وضعیت محصولات</h2>
            </div>
            {data.products ? (
              <span className={styles.stateBadge} data-state={data.products.state}>
                {stateLabel(data.products.state)}
              </span>
            ) : null}
          </div>

          {!data.products ? (
            <EmptyPanel
              title="Commerce برای این سطح دسترسی نمایش داده نمی‌شود."
              detail="Home از نبود permission درباره وجود محصول یا اشتراک نتیجه‌گیری نمی‌کند."
            />
          ) : data.products.items.length > 0 ? (
            <div className={styles.productGrid}>
              {data.products.items.slice(0, 6).map((product) => (
                <article className={styles.productCard} key={product.code}>
                  <div>
                    <strong>{product.name}</strong>
                    <span className={styles.productCode}>{product.code}</span>
                  </div>
                  <div>
                    <span>{product.status}</span>
                    <strong>{numberFormat.format(product.planCount)} پلن</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyPanel
              title={
                data.products.state === "unavailable"
                  ? "منبع Commerce در دسترس نیست."
                  : "محصولی در منبع canonical ثبت نشده است."
              }
              detail={freshnessLabel(data.products.asOfUtc)}
            />
          )}
        </section>

        <section className={styles.panel} aria-labelledby="services-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Service status</p>
              <h2 id="services-title">وضعیت سرویس‌ها</h2>
            </div>
            <span className={styles.stateBadge} data-state={data.services.state}>
              {stateLabel(data.services.state)}
            </span>
          </div>
          <EmptyPanel title="وضعیت سرویس‌ها فعلاً در دسترس نیست." detail={data.services.reason} />
        </section>
      </div>

      <section className={styles.shortcuts} aria-labelledby="founder-shortcuts-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className="eyebrow">Founder shortcuts</p>
            <h2 id="founder-shortcuts-title">مسیرهای سریع مجاز</h2>
          </div>
        </div>
        {data.shortcuts.length > 0 ? (
          <nav className={styles.shortcutGrid} aria-label="مسیرهای سریع مرکز فرماندهی">
            {data.shortcuts.map((shortcut) => (
              <Link className={styles.shortcutCard} href={shortcut.href} key={shortcut.href}>
                <strong>{shortcut.label}</strong>
                <span>{shortcut.helper}</span>
              </Link>
            ))}
          </nav>
        ) : (
          <EmptyPanel
            title="میانبر قابل نمایش وجود ندارد."
            detail="Navigation نیز از permission boundary عبور نمی‌کند."
          />
        )}
      </section>
    </div>
  );
}
