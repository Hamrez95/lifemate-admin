import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getFinanceBudgetVsActual,
  type FinanceBudgetResponse,
  type FinanceFavorability,
  type FinanceVariance,
} from "@/src/lib/admin-api/finance-budget";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../finance.module.css";

type FinanceBudgetPageProps = {
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

function monthEnd(month: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || monthNumber < 1 || monthNumber > 12) return null;
  const day = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

function reportParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  const fromMonth = single(searchParams.fromMonth);
  const toMonth = single(searchParams.toMonth);
  const currency = single(searchParams.currency);
  if (fromMonth && /^\d{4}-\d{2}$/.test(fromMonth)) {
    params.set("from", `${fromMonth}-01`);
  }
  const to = toMonth ? monthEnd(toMonth) : null;
  if (to) params.set("to", to);
  if (currency) params.set("currency", currency);
  return params;
}

function currencyHref(report: FinanceBudgetResponse, currency: string): string {
  const params = new URLSearchParams({
    fromMonth: report.query.from.slice(0, 7),
    toMonth: report.query.to.slice(0, 7),
    currency,
  });
  return `/finance/budget?${params.toString()}`;
}

function formatMinorAmount(amountMinor: string, currency: string, exponent: number): string {
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

function formatBasisPoints(value: string | null): string {
  if (value === null) return "—";
  const basisPoints = BigInt(value);
  const negative = basisPoints < 0n;
  const absolute = negative ? -basisPoints : basisPoints;
  const whole = absolute / 100n;
  const fraction = absolute % 100n;
  return `${negative ? "−" : "+"}${toPersianDigits(whole.toString())}٫${toPersianDigits(
    fraction.toString().padStart(2, "0"),
  )}٪`;
}

function favorabilityText(value: FinanceFavorability | null): string {
  if (value === "favorable") return "مطلوب";
  if (value === "unfavorable") return "نامطلوب";
  if (value === "on_budget") return "طبق بودجه";
  return "بودجه ثبت نشده";
}

function formatAsOf(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

export default async function FinanceBudgetPage({ searchParams }: FinanceBudgetPageProps) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("finance.read")) redirect("/forbidden");

  const requested = await searchParams;
  const result = await getFinanceBudgetVsActual(reportParams(requested));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");

  const report = result.kind === "ok" ? result.data : null;
  const comparison = report?.state === "ready" ? report.comparison : null;
  const canFormat = Boolean(comparison && report?.currency && report.minorUnitExponent !== null);
  const money = (value: string | null | undefined) =>
    canFormat && value !== null && value !== undefined && report?.currency &&
      report.minorUnitExponent !== null
      ? formatMinorAmount(value, report.currency, report.minorUnitExponent)
      : "—";
  const fromMonth = report?.query.from.slice(0, 7) ?? single(requested.fromMonth) ?? "";
  const toMonth = report?.query.to.slice(0, 7) ?? single(requested.toMonth) ?? "";
  const filterCurrency = report?.query.currency ?? single(requested.currency);

  const cards: Array<{ label: string; helper: string; value: FinanceVariance | null }> = [
    { label: "درآمد", helper: "Revenue · Budget vs Actual", value: comparison?.totals.revenue ?? null },
    { label: "هزینه", helper: "Expense · Budget vs Actual", value: comparison?.totals.expense ?? null },
    { label: "خالص", helper: "Net result · Budget vs Actual", value: comparison?.totals.net ?? null },
  ];

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="finance"
        title="مالی"
        subtitle="بودجه مصوب در برابر عملکرد واقعی، بدون فرض عدد گمشده"
      >
        <div className={styles.page}>
          <section className={styles.hero} aria-labelledby="finance-budget-title">
            <div>
              <p className="eyebrow">ADM-FIN-002 · Budget vs Actual</p>
              <h2 id="finance-budget-title">بودجه در برابر عملکرد واقعی</h2>
              <p>
                Budget و Actual از دو منبع canonical جدا خوانده می‌شوند. ماه ناقص، بودجه گمشده و
                تبدیل ارزی هیچ‌کدام در مرورگر حدس زده نمی‌شوند.
              </p>
              <div className={styles.filterActions}>
                <Link href="/finance">بازگشت به سود و زیان</Link>
              </div>
            </div>
            <div className={styles.period} aria-label="بازه مقایسه بودجه">
              <span>بازه ماهانه</span>
              <strong>
                {report
                  ? `${toPersianDigits(report.query.from)} تا ${toPersianDigits(report.query.to)}`
                  : "—"}
              </strong>
              <small>Freshness مشترک: {formatAsOf(report?.freshness.asOfUtc ?? null)}</small>
            </div>
          </section>

          <form
            className={styles.filters}
            action="/finance/budget"
            method="get"
            aria-label="فیلتر بازه بودجه"
          >
            <div className={styles.filterField}>
              <label htmlFor="budget-from-month">از ماه</label>
              <input
                id="budget-from-month"
                name="fromMonth"
                type="month"
                defaultValue={fromMonth}
              />
            </div>
            <div className={styles.filterField}>
              <label htmlFor="budget-to-month">تا ماه</label>
              <input id="budget-to-month" name="toMonth" type="month" defaultValue={toMonth} />
            </div>
            {filterCurrency ? <input type="hidden" name="currency" value={filterCurrency} /> : null}
            <div className={styles.filterActions}>
              <button type="submit">اعمال بازه</button>
              <Link href="/finance/budget">ماه جاری</Link>
            </div>
          </form>

          {report?.state === "currency_required" ? (
            <section className={styles.stateBanner} role="status">
              <span className={styles.stateIcon} aria-hidden="true">
                i
              </span>
              <div>
                <strong>برای این بازه چند ارز قابل مقایسه است.</strong>
                <p>ارز را صریح انتخاب کنید؛ تبدیل FX خودکار ممنوع است.</p>
                <div className={styles.currencyChoices} aria-label="انتخاب ارز مقایسه بودجه">
                  {report.availableCurrencies.map((currency) => (
                    <Link key={currency} href={currencyHref(report, currency)}>
                      {currency}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {!comparison ? (
            <section className={styles.stateBanner} role="status" aria-live="polite">
              <span className={styles.stateIcon} aria-hidden="true">
                i
              </span>
              <div>
                <strong>مقایسه معتبر Budget vs Actual در دسترس نیست.</strong>
                <p>
                  {report?.reason ??
                    (result.kind === "invalid"
                      ? "بازه باید از ماه‌های کامل تقویمی تشکیل شود؛ هیچ budget prorating حدسی انجام نشد."
                      : "Admin API یا منبع بودجه در دسترس نیست؛ مقدار گمشده صفر فرض نشده است.")}
                </p>
              </div>
            </section>
          ) : null}

          <section className={styles.cardGrid} aria-label="خلاصه بودجه در برابر عملکرد">
            {cards.map((card) => (
              <article key={card.label} className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span>{card.helper}</span>
                  <span className={styles.badge}>BUDGET / ACTUAL</span>
                </div>
                <strong>{money(card.value?.actualMinor)}</strong>
                <p>بودجه: {money(card.value?.budgetMinor)}</p>
                <p>
                  انحراف: {money(card.value?.varianceMinor)} ·{" "}
                  {formatBasisPoints(card.value?.varianceBasisPoints ?? null)} ·{" "}
                  {favorabilityText(card.value?.favorability ?? null)}
                </p>
              </article>
            ))}
          </section>

          <section className={styles.panel} aria-labelledby="budget-source-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Source &amp; approval</p>
                <h3 id="budget-source-title">منابع مقایسه</h3>
              </div>
              <span className={styles.sourcePill}>
                {report?.freshness.status ?? "unavailable"}
              </span>
            </header>
            <div className={styles.seriesList} role="list" aria-label="منابع بودجه و Actual">
              <div className={styles.seriesRow} role="listitem">
                <strong>Budget</strong>
                <span>{report?.budgetSource?.label ?? "—"}</span>
                <span>
                  {report?.budgetSource
                    ? `${report.budgetSource.code} · v${report.budgetSource.version}`
                    : "منبع مصوب موجود نیست"}
                </span>
                <span>تصویب: {formatAsOf(report?.budgetSource?.approvedAtUtc ?? null)}</span>
              </div>
              <div className={styles.seriesRow} role="listitem">
                <strong>Actual</strong>
                <span>{report?.actualSource?.label ?? "—"}</span>
                <span>
                  {report?.actualSource
                    ? `Definition v${report.actualSource.definitionVersion}`
                    : "منبع Actual موجود نیست"}
                </span>
                <span>Read-only canonical ledger</span>
              </div>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="budget-table-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Category variance</p>
                <h3 id="budget-table-title">انحراف بر اساس دسته مالی</h3>
              </div>
              <span className={styles.sourcePill}>رنگ تنها نشانه وضعیت نیست</span>
            </header>
            <div
              className={styles.tableWrap}
              role="region"
              aria-labelledby="budget-table-title"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">دسته</th>
                    <th scope="col">نوع</th>
                    <th scope="col">Budget</th>
                    <th scope="col">Actual</th>
                    <th scope="col">Variance</th>
                    <th scope="col">٪ انحراف</th>
                    <th scope="col">تفسیر</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison?.categories.length ? (
                    comparison.categories.map((row) => (
                      <tr key={`${row.kind}:${row.code}`}>
                        <th scope="row">{row.label}</th>
                        <td>{row.kind === "Revenue" ? "درآمد" : "هزینه"}</td>
                        <td>{money(row.budgetMinor)}</td>
                        <td>{money(row.actualMinor)}</td>
                        <td>{money(row.varianceMinor)}</td>
                        <td>{formatBasisPoints(row.varianceBasisPoints)}</td>
                        <td>{favorabilityText(row.favorability)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>دسته قابل مقایسه‌ای برای این بازه موجود نیست.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className={styles.footnote}>
              «مطلوب/نامطلوب» برای هزینه جهت معکوس درآمد دارد: هزینه کمتر از بودجه مطلوب است. برای
              دسته‌ای که budget ندارد، variance و درصد عمداً `—` باقی می‌ماند؛ اما Actual ثبت‌شده
              همچنان نمایش داده می‌شود.
            </p>
          </section>
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
