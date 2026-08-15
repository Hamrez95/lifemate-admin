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

export function FounderOverview({ data }: { data: FounderOverviewData }) {
  return (
    <div className="dashboard-stack">
      <section className={styles.hero} aria-labelledby="founder-pulse-title">
        <div className={styles.heroCopy}>
          <p className="eyebrow">Founder pulse · داده قابل ردیابی</p>
          <h2 id="founder-pulse-title">آنچه الان برای تصمیم مدیریتی مهم است، بدون عدد نمایشی.</h2>
          <p>
            هر کارت فقط از منبع مجاز همان حوزه می‌آید. منبع ناقص یا قطع‌شده با «—» و وضعیت صریح
            نمایش داده می‌شود؛ نبود داده هرگز به صفر تبدیل نمی‌شود.
          </p>
        </div>
        <div className={styles.heroPulse} aria-label="وضعیت تازگی نمای اجرایی">
          <span className="state-pill state-pill--safe">Permission-aware</span>
          <strong>آخرین جمع‌آوری نمای مدیریتی</strong>
          <span>{freshnessLabel(data.generatedAtUtc)}</span>
          <span>Raw Health و Women Health در این نما تجمیع نمی‌شوند.</span>
        </div>
      </section>

      <section className="section-card" aria-labelledby="executive-metrics-title">
        <div className="section-card__header">
          <div>
            <p className="eyebrow">Executive metrics</p>
            <h2 id="executive-metrics-title">پالس اکوسیستم</h2>
          </div>
          <span className="state-pill state-pill--safe">منبع + freshness روی هر کارت</span>
        </div>

        {data.metrics.length > 0 ? (
          <div className="metric-grid">
            {data.metrics.map((metric) => (
              <Link className={styles.metricLink} href={metric.href} key={metric.key}>
                <article
                  className={`metric-card ${styles.metricCard}`}
                  data-tone={metric.tone}
                  aria-label={`${metric.label}: ${metricValue(metric.value)}`}
                >
                  <div className="metric-card__topline">
                    <span className="metric-card__icon" aria-hidden="true">
                      ◌
                    </span>
                    <span>{metric.label}</span>
                  </div>
                  <strong className={styles.metricValue}>{metricValue(metric.value)}</strong>
                  <p className={styles.metricNote}>{metric.note ?? metric.source}</p>
                  <div className={styles.metricFooter}>
                    <span className={styles.stateBadge} data-state={metric.state}>
                      {stateLabel(metric.state)}
                    </span>
                    <span className={styles.sourceMeta}>{freshnessLabel(metric.asOfUtc)}</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyBox}>
            <div>
              <strong>برای KPIهای این صفحه دسترسی فعالی وجود ندارد.</strong>
              <p>وجود یا مقدار منابع غیرمجاز از طریق Home افشا نمی‌شود.</p>
            </div>
          </div>
        )}
      </section>

      <div className={styles.twoColumn}>
        <section className="section-card" aria-labelledby="product-status-title">
          <div className="section-card__header">
            <div>
              <p className="eyebrow">Product & commerce</p>
              <h2 id="product-status-title">وضعیت محصولات</h2>
            </div>
            {data.products ? (
              <span className={styles.stateBadge} data-state={data.products.state}>
                {stateLabel(data.products.state)}
              </span>
            ) : null}
          </div>

          {!data.products ? (
            <div className={styles.emptyBox}>
              <div>
                <strong>Commerce برای این مدیر نمایش داده نمی‌شود.</strong>
                <p>Home از روی نبود permission درباره وجود محصول یا اشتراک نتیجه‌گیری نمی‌کند.</p>
              </div>
            </div>
          ) : data.products.state === "unavailable" ? (
            <div className={styles.emptyBox}>
              <div>
                <strong>منبع Commerce موقتاً در دسترس نیست.</strong>
                <p>وضعیت محصول با مقدار ساختگی جایگزین نشده است.</p>
              </div>
            </div>
          ) : data.products.items.length === 0 ? (
            <div className={styles.emptyBox}>
              <div>
                <strong>محصولی در منبع canonical ثبت نشده است.</strong>
                <p>{freshnessLabel(data.products.asOfUtc)}</p>
              </div>
            </div>
          ) : (
            <div className={styles.productGrid}>
              {data.products.items.slice(0, 6).map((product) => (
                <article className={styles.productCard} key={product.code}>
                  <div className={styles.productTop}>
                    <strong>{product.name}</strong>
                    <span className={styles.stateBadge} data-state="ready">
                      {product.status}
                    </span>
                  </div>
                  <span className={styles.productCode}>{product.code}</span>
                  <p>{numberFormat.format(product.planCount)} پلن ثبت‌شده</p>
                </article>
              ))}
            </div>
          )}
          {data.products ? (
            <p className={styles.meta}>
              منبع: {data.products.source} · {freshnessLabel(data.products.asOfUtc)}
            </p>
          ) : null}
        </section>

        <section className="section-card" aria-labelledby="attention-sources-title">
          <div className="section-card__header">
            <div>
              <p className="eyebrow">Attention map</p>
              <h2 id="attention-sources-title">منابع نیازمند توجه</h2>
            </div>
            {data.alerts ? (
              <span className={styles.stateBadge} data-state={data.alerts.state}>
                {stateLabel(data.alerts.state)}
              </span>
            ) : null}
          </div>

          {!data.alerts ? (
            <div className={styles.emptyBox}>
              <div>
                <strong>هیچ منبع Alert مجازی برای این مدیر وجود ندارد.</strong>
                <p>حتی count منابع غیرمجاز در Home نمایش داده نمی‌شود.</p>
              </div>
            </div>
          ) : (
            <div className={styles.sourceGrid}>
              {data.alerts.sources.map((source) => {
                const content = (
                  <article className={styles.sourceCard}>
                    <div className={styles.sourceTop}>
                      <strong>{sourceLabels[source.source]}</strong>
                      <span className={styles.stateBadge} data-state={source.state}>
                        {stateLabel(source.state)}
                      </span>
                    </div>
                    <div className={styles.sourceCount}>
                      {source.unreadCount === null ? "—" : numberFormat.format(source.unreadCount)}
                    </div>
                    <p>مورد خوانده‌نشده · {freshnessLabel(source.asOfUtc)}</p>
                  </article>
                );
                return source.href ? (
                  <Link className={styles.metricLink} href={source.href} key={source.source}>
                    {content}
                  </Link>
                ) : (
                  <div key={source.source}>{content}</div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {data.alerts && data.alerts.items.length > 0 ? (
        <section className="section-card" aria-labelledby="priority-alerts-title">
          <div className="section-card__header">
            <div>
              <p className="eyebrow">Priority alerts</p>
              <h2 id="priority-alerts-title">موارد مهم برای بررسی</h2>
            </div>
            <span className="state-pill">حداکثر ۶ مورد از منابع مجاز</span>
          </div>
          <div className={styles.alertList}>
            {data.alerts.items.map((alert) => {
              const content = (
                <>
                  <div className={styles.alertTop}>
                    <strong>{alert.title}</strong>
                    <span className={styles.stateBadge} data-state="partial">
                      {sourceLabels[alert.source]}
                    </span>
                  </div>
                  <p>{alert.summary ?? "جزئیات بیشتری در منبع این حوزه موجود است."}</p>
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
                  {content}
                </Link>
              ) : (
                <article
                  className={styles.alertCard}
                  data-severity={alert.severity}
                  key={alert.alertKey}
                >
                  {content}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="section-card" aria-labelledby="founder-shortcuts-title">
        <div className="section-card__header">
          <div>
            <p className="eyebrow">Founder shortcuts</p>
            <h2 id="founder-shortcuts-title">مسیرهای سریع مجاز</h2>
          </div>
        </div>
        {data.shortcuts.length > 0 ? (
          <nav className={styles.shortcutGrid} aria-label="مسیرهای سریع مرکز فرماندهی">
            {data.shortcuts.map((shortcut) => (
              <Link className={styles.shortcutCard} href={shortcut.href} key={shortcut.href}>
                <strong>
                  {shortcut.label}
                  <span className={styles.shortcutArrow} aria-hidden="true">
                    ←
                  </span>
                </strong>
                <p>{shortcut.helper}</p>
              </Link>
            ))}
          </nav>
        ) : (
          <div className={styles.emptyBox}>
            <div>
              <strong>میانبر قابل نمایش وجود ندارد.</strong>
              <p>Navigation هم از permission boundary عبور نمی‌کند.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
