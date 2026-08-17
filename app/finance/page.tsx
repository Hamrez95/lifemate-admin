import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getFinanceProfitLoss,
  type FinanceProfitLossResponse,
} from "@/src/lib/admin-api/finance-profit-loss";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./finance.module.css";

type FinancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PERSIAN_DIGITS: Record<string, string> = {
  "0": "۰",
  "1": "۱",
  "2": "۲",
  "3": "۳",
  "4": "۴",
  "5": "۵",
  "6": "۶",
  "7": "۷",
  "8": "۸",
  "9": "۹",
};

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (digit) => PERSIAN_DIGITS[digit] ?? digit);
}

export function formatMinorAmount(amountMinor: string, currency: string, exponent: number): string {
  const value = BigInt(amountMinor);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const divisor = 10n ** BigInt(exponent);
  const whole = absolute / divisor;
  const fraction = absolute % divisor;
  const wholeText = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(whole);
  const fractionText =
    exponent > 0 ? `٫${toPersianDigits(fraction.toString().padStart(exponent, "0"))}` : "";
  return `${negative ? "−" : ""}${wholeText}${fractionText} ${currency}`;
}

function formatAsOf(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

function reportParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const key of ["from", "to", "currency"] as const) {
    const value = single(searchParams[key]);
    if (value) params.set(key, value);
  }
  return params;
}

function currencyHref(report: FinanceProfitLossResponse, currency: string): string {
  const params = new URLSearchParams({
    from: report.query.from,
    to: report.query.to,
    currency,
  });
  return `/finance?${params.toString()}`;
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("finance.read")) redirect("/forbidden");

  const requested = await searchParams;
  const result = await getFinanceProfitLoss(reportParams(requested));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");

  const report = result.kind === "ok" ? result.data : null;
  const actual = report?.state === "ready" ? report.actual : null;
  const canFormat = Boolean(actual && report?.currency && report.minorUnitExponent !== null);
  const money = (value: string | null | undefined) =>
    canFormat && value && report?.currency && report.minorUnitExponent !== null
      ? formatMinorAmount(value, report.currency, report.minorUnitExponent)
      : "—";
  const expenseCategories = actual?.categories.filter((item) => item.kind === "Expense") ?? [];

  const cards = [
    {
      label: "درآمد واقعی",
      helper: "Actual revenue",
      value: money(actual?.revenueMinor),
      tone: "mint",
      badge: "ACTUAL",
    },
    {
      label: "هزینه واقعی",
      helper: "Actual expenses",
      value: money(actual?.expenseMinor),
      tone: "peach",
      badge: "ACTUAL",
    },
    {
      label: "سود / زیان خالص",
      helper: "Actual net result",
      value: money(actual?.netResultMinor),
      tone: "blue",
      badge: "ACTUAL",
    },
    {
      label: "پیش‌بینی",
      helper: "Forecast",
      value: "—",
      tone: "lavender",
      badge: "FORECAST",
    },
  ] as const;

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="finance"
        title="مالی"
        subtitle="سود و زیان مدیریتی با جداسازی صریح Actual و Forecast"
      >
        <div className={styles.page}>
          <section className={styles.hero} aria-labelledby="finance-title">
            <div>
              <p className="eyebrow">ADM-FIN-001 · Profit &amp; Loss</p>
              <h2 id="finance-title">نمای کلی مالی LifeMate</h2>
              <p>
                فقط actualهای ثبت‌شده در ledger مالی canonical نمایش داده می‌شوند. Forecast از
                Actual استنباط نمی‌شود و نبود داده با صفر جایگزین نمی‌شود.
              </p>
            </div>
            <div className={styles.period} aria-label="بازه گزارش">
              <span>بازه گزارش</span>
              <strong>
                {report
                  ? `${toPersianDigits(report.query.from)} تا ${toPersianDigits(report.query.to)}`
                  : "—"}
              </strong>
              <small>آخرین ثبت: {formatAsOf(report?.freshness.asOfUtc ?? null)}</small>
            </div>
          </section>

          {report?.state === "currency_required" ? (
            <section className={styles.stateBanner} role="status">
              <span className={styles.stateIcon} aria-hidden="true">
                i
              </span>
              <div>
                <strong>برای این بازه چند ارز ثبت شده است.</strong>
                <p>تبدیل ارزی خودکار انجام نمی‌شود. ارز گزارش را صریح انتخاب کنید.</p>
                <div className={styles.currencyChoices} aria-label="انتخاب ارز گزارش">
                  {report.availableCurrencies.map((currency) => (
                    <Link key={currency} href={currencyHref(report, currency)}>
                      {currency}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {!actual ? (
            <section className={styles.stateBanner} role="status" aria-live="polite">
              <span className={styles.stateIcon} aria-hidden="true">
                i
              </span>
              <div>
                <strong>Actual معتبر برای این گزارش در دسترس نیست.</strong>
                <p>
                  {report?.reason ??
                    (result.kind === "invalid"
                      ? "فیلتر گزارش معتبر نیست؛ هیچ عددی نمایش داده نشد."
                      : "Admin API یا read model مالی در دسترس نیست؛ مقدار صفر فرض نشده است.")}
                </p>
              </div>
            </section>
          ) : null}

          <section className={styles.cardGrid} aria-label="شاخص‌های اصلی سود و زیان">
            {cards.map((card) => (
              <article key={card.label} className={`${styles.metricCard} ${styles[card.tone]}`}>
                <div className={styles.metricHeader}>
                  <span>{card.helper}</span>
                  <span className={styles.badge}>{card.badge}</span>
                </div>
                <strong aria-label={`${card.label}: ${card.value}`}>{card.value}</strong>
                <p>
                  {card.badge === "FORECAST"
                    ? (report?.forecast.reason ?? "منبع forecast تأیید نشده")
                    : actual
                      ? `منبع: ${report?.source.label}`
                      : "منبع actual در دسترس نیست"}
                </p>
              </article>
            ))}
          </section>

          <section className={styles.splitGrid}>
            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Actual</p>
                  <h3>روند ماهانه درآمد و هزینه</h3>
                </div>
                <span className={styles.sourcePill}>
                  {report
                    ? `Definition v${report.source.definitionVersion}`
                    : "Source: unavailable"}
                </span>
              </header>
              {actual?.series.length ? (
                <div className={styles.seriesList} role="list" aria-label="روند ماهانه سود و زیان">
                  {actual.series.map((point) => (
                    <div key={point.month} className={styles.seriesRow} role="listitem">
                      <strong>{toPersianDigits(point.month)}</strong>
                      <span>درآمد {money(point.revenueMinor)}</span>
                      <span>هزینه {money(point.expenseMinor)}</span>
                      <span>خالص {money(point.netResultMinor)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={styles.chartPlaceholder}
                  role="img"
                  aria-label="روند ماهانه ناموجود است"
                >
                  <span>داده ماهانه معتبر برای بازه انتخابی موجود نیست.</span>
                </div>
              )}
            </article>

            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Expense structure</p>
                  <h3>گروه‌های هزینه واقعی</h3>
                </div>
              </header>
              {expenseCategories.length ? (
                <ul className={styles.expenseList}>
                  {expenseCategories.map((group) => (
                    <li key={group.code}>
                      <span>{group.label}</span>
                      <strong>{money(group.amountMinor)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.chartPlaceholder} role="status">
                  <span>گروه هزینه ثبت‌شده‌ای برای این بازه موجود نیست.</span>
                </div>
              )}
            </article>
          </section>

          <section className={styles.panel} aria-labelledby="finance-table-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">P&amp;L statement</p>
                <h3 id="finance-table-title">صورت سود و زیان</h3>
              </div>
              <span className={styles.sourcePill}>
                Freshness: {report?.freshness.status ?? "unavailable"}
              </span>
            </header>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">ردیف</th>
                    <th scope="col">Actual</th>
                    <th scope="col">Forecast</th>
                    <th scope="col">منبع</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["درآمد", actual?.revenueMinor],
                    ["هزینه", actual?.expenseMinor],
                    ["سود / زیان خالص", actual?.netResultMinor],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{money(value)}</td>
                      <td>—</td>
                      <td>
                        {actual ? (
                          report?.source.label
                        ) : (
                          <span className={styles.unavailable}>ناموجود</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.footnote}>
              Actual و Forecast دو source مستقل هستند. هیچ FX، forecast، budget یا مقدار گمشده‌ای در
              مرورگر حدس زده نمی‌شود.
            </p>
          </section>
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
