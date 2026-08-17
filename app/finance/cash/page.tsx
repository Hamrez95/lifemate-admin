import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getFinanceCashPlanning,
  type FinanceCashResponse,
  type FinanceForecastScenario,
  type FinanceScenario,
} from "@/src/lib/admin-api/finance-cash";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../finance.module.css";

type FinanceCashPageProps = {
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
  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) return null;
  const day = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

function reportParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  const fromMonth = single(searchParams.fromMonth);
  const toMonth = single(searchParams.toMonth);
  const currency = single(searchParams.currency);
  const horizonMonths = single(searchParams.horizonMonths);
  if (fromMonth && /^\d{4}-\d{2}$/.test(fromMonth)) params.set("from", `${fromMonth}-01`);
  const to = toMonth ? monthEnd(toMonth) : null;
  if (to) params.set("to", to);
  if (currency) params.set("currency", currency);
  if (horizonMonths && /^\d{1,2}$/.test(horizonMonths)) params.set("horizonMonths", horizonMonths);
  return params;
}

function currencyHref(report: FinanceCashResponse, currency: string): string {
  const params = new URLSearchParams({
    fromMonth: report.query.from.slice(0, 7),
    toMonth: report.query.to.slice(0, 7),
    currency,
    horizonMonths: String(report.query.horizonMonths),
  });
  return `/finance/cash?${params.toString()}`;
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

function formatRunway(value: string | null): string {
  if (value === null) return "—";
  const basisPoints = BigInt(value);
  const whole = basisPoints / 10_000n;
  const fraction = (basisPoints % 10_000n) / 100n;
  return `${toPersianDigits(whole.toString())}٫${toPersianDigits(
    fraction.toString().padStart(2, "0"),
  )} ماه`;
}

function formatAsOf(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

function scenarioTitle(value: FinanceScenario): string {
  if (value === "Base") return "سناریوی پایه";
  if (value === "Upside") return "سناریوی خوش‌بینانه";
  return "سناریوی بدبینانه";
}

function scenarioRunwayText(scenario: FinanceForecastScenario): string {
  if (scenario.projectedCash.runwayState === "unavailable") return "Runway پیش‌بینی‌شده ناموجود";
  if (scenario.projectedCash.runwayState === "depletes_within_horizon") {
    return scenario.projectedCash.depletionMonth
      ? `نقدینگی در ${toPersianDigits(scenario.projectedCash.depletionMonth)} به صفر می‌رسد`
      : "نقدینگی در افق انتخابی به صفر می‌رسد";
  }
  return "نقدینگی تا پایان افق انتخابی مثبت می‌ماند";
}

export default async function FinanceCashPage({ searchParams }: FinanceCashPageProps) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("finance.read")) redirect("/forbidden");

  const requested = await searchParams;
  const result = await getFinanceCashPlanning(reportParams(requested));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");

  const report = result.kind === "ok" ? result.data : null;
  const actual = report?.actual?.state === "ready" ? report.actual.burn : null;
  const cash = report?.cash?.state === "ready" ? report.cash : null;
  const forecast = report?.forecast?.state === "ready" ? report.forecast : null;
  const canFormat = Boolean(report?.currency && report.minorUnitExponent !== null);
  const money = (value: string | null | undefined) =>
    canFormat &&
    value !== null &&
    value !== undefined &&
    report?.currency &&
    report.minorUnitExponent !== null
      ? formatMinorAmount(value, report.currency, report.minorUnitExponent)
      : "—";
  const fromMonth = report?.query.from.slice(0, 7) ?? single(requested.fromMonth) ?? "";
  const toMonth = report?.query.to.slice(0, 7) ?? single(requested.toMonth) ?? "";
  const horizonMonths = report?.query.horizonMonths ?? Number(single(requested.horizonMonths) ?? 6);
  const filterCurrency = report?.query.currency ?? single(requested.currency);

  const cards = [
    {
      label: "موجودی نقد واقعی",
      helper: "Observed cash · ACTUAL",
      value: money(cash?.balanceMinor),
      detail: cash ? `As of ${toPersianDigits(cash.asOfDate ?? "")}` : "منبع canonical موجود نیست",
    },
    {
      label: "Gross burn متوسط",
      helper: "Trailing actual expenses",
      value: money(actual?.averageGrossBurnMinor),
      detail: actual
        ? `${toPersianDigits(String(actual.monthCount))} ماه کامل Actual`
        : "Actual کامل موجود نیست",
    },
    {
      label: "Net burn متوسط",
      helper: "Expenses − revenue · ACTUAL",
      value: money(actual?.averageNetBurnMinor),
      detail: "از actualهای ثبت‌شده؛ نه Forecast",
    },
    {
      label: "Runway تاریخی",
      helper: "Cash ÷ positive average net burn",
      value: formatRunway(report?.runway?.trailingMonthsBasisPoints ?? null),
      detail:
        report?.runway?.state === "not_burning"
          ? "Net burn مثبت نیست؛ runway محدود ادعا نمی‌شود"
          : (report?.runway?.reason ?? "فرمول canonical read model"),
    },
  ];

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="finance"
        title="مالی"
        subtitle="Burn Rate، Runway و Cash Planning با تفکیک صریح Actual و Forecast"
      >
        <div className={styles.page}>
          <section className={styles.hero} aria-labelledby="finance-cash-title">
            <div>
              <p className="eyebrow">ADM-FIN-003 · Burn Rate / Runway / Cash Planning</p>
              <h2 id="finance-cash-title">برنامه‌ریزی نقدینگی</h2>
              <p>
                Cash Actual، burn تاریخی و Forecast سناریویی sourceهای مستقل‌اند. هیچ عدد گمشده، FX
                یا فرض Forecast از روی Actual ساخته نمی‌شود.
              </p>
              <div className={styles.filterActions}>
                <Link href="/finance">سود و زیان</Link>
                <Link href="/finance/budget">Budget vs Actual</Link>
              </div>
            </div>
            <div className={styles.period} aria-label="مرز Actual و Forecast">
              <span>Actual کامل‌شده</span>
              <strong>
                {report
                  ? `${toPersianDigits(report.query.from)} تا ${toPersianDigits(report.query.to)}`
                  : "—"}
              </strong>
              <small>Forecast horizon: {toPersianDigits(String(horizonMonths))} ماه</small>
            </div>
          </section>

          <form
            className={styles.filters}
            action="/finance/cash"
            method="get"
            aria-label="فیلتر برنامه‌ریزی نقدینگی"
          >
            <div className={styles.filterField}>
              <label htmlFor="cash-from-month">از ماه Actual</label>
              <input id="cash-from-month" name="fromMonth" type="month" defaultValue={fromMonth} />
            </div>
            <div className={styles.filterField}>
              <label htmlFor="cash-to-month">تا ماه Actual</label>
              <input id="cash-to-month" name="toMonth" type="month" defaultValue={toMonth} />
            </div>
            <div className={styles.filterField}>
              <label htmlFor="cash-horizon">افق Forecast (ماه)</label>
              <input
                id="cash-horizon"
                name="horizonMonths"
                type="number"
                min={1}
                max={18}
                defaultValue={horizonMonths}
              />
            </div>
            {filterCurrency ? <input type="hidden" name="currency" value={filterCurrency} /> : null}
            <div className={styles.filterActions}>
              <button type="submit">اعمال</button>
              <Link href="/finance/cash">پیش‌فرض</Link>
            </div>
          </form>

          {report?.state === "currency_required" ? (
            <section className={styles.stateBanner} role="status">
              <span className={styles.stateIcon} aria-hidden="true">
                i
              </span>
              <div>
                <strong>چند ارز در sourceهای Cash Planning وجود دارد.</strong>
                <p>ارز را صریح انتخاب کنید؛ هیچ تبدیل FX خودکاری انجام نمی‌شود.</p>
                <div className={styles.currencyChoices} aria-label="انتخاب ارز Cash Planning">
                  {report.availableCurrencies.map((currency) => (
                    <Link key={currency} href={currencyHref(report, currency)}>
                      {currency}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {report?.state !== "ready" ? (
            <section className={styles.stateBanner} role="status" aria-live="polite">
              <span className={styles.stateIcon} aria-hidden="true">
                i
              </span>
              <div>
                <strong>
                  {report?.state === "partial"
                    ? "Cash Planning به‌صورت بخشی در دسترس است."
                    : "Cash Planning کامل در دسترس نیست."}
                </strong>
                <p>
                  {report?.reason ??
                    (result.kind === "invalid"
                      ? "بازه Actual باید از ماه‌های تقویمی کامل‌شده باشد و horizon بین ۱ تا ۱۸ ماه بماند."
                      : "Admin API یا source canonical در دسترس نیست؛ مقدار گمشده صفر فرض نشده است.")}
                </p>
              </div>
            </section>
          ) : null}

          {report?.cash?.freshness.status === "stale" ? (
            <section className={styles.stateBanner} role="status">
              <span className={styles.stateIcon} aria-hidden="true">
                !
              </span>
              <div>
                <strong>Cash snapshot قدیمی است.</strong>
                <p>{report.cash.reason ?? "تاریخ snapshot با انتهای بازه Actual هم‌تراز نیست."}</p>
              </div>
            </section>
          ) : null}

          <section className={styles.cardGrid} aria-label="شاخص‌های Burn Rate و Runway">
            {cards.map((card) => (
              <article key={card.label} className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span>{card.helper}</span>
                  <span className={styles.badge}>ACTUAL</span>
                </div>
                <h3>{card.label}</h3>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </article>
            ))}
          </section>

          <section className={styles.panel} aria-labelledby="cash-sources-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Actual source disclosure</p>
                <h3 id="cash-sources-title">منابع Actual و تازگی داده</h3>
              </div>
              <span className={styles.sourcePill}>{report?.state ?? "unavailable"}</span>
            </header>
            <div
              className={styles.seriesList}
              role="list"
              aria-label="منابع Cash Actual و Burn Actual"
            >
              <div className={styles.seriesRow} role="listitem">
                <strong>Cash Actual</strong>
                <span>{report?.cash?.source?.label ?? "—"}</span>
                <span>{report?.cash?.source?.sourceKind ?? "Source unavailable"}</span>
                <span>Observed: {formatAsOf(report?.cash?.freshness.asOfUtc ?? null)}</span>
              </div>
              <div className={styles.seriesRow} role="listitem">
                <strong>Burn Actual</strong>
                <span>{report?.actual?.source?.label ?? "—"}</span>
                <span>
                  {report?.actual?.source
                    ? `Definition v${report.actual.source.definitionVersion}`
                    : "Source unavailable"}
                </span>
                <span>Posted: {formatAsOf(report?.actual?.freshness.asOfUtc ?? null)}</span>
              </div>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="forecast-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">FORECAST · versioned assumptions</p>
                <h3 id="forecast-title">سناریوهای Cash Forecast</h3>
              </div>
              <span className={styles.sourcePill}>
                {forecast?.plan
                  ? `${forecast.plan.code} · v${forecast.plan.version}`
                  : "Forecast unavailable"}
              </span>
            </header>

            {forecast?.plan ? (
              <p className={styles.footnote}>
                {forecast.plan.label} · تصویب {formatAsOf(forecast.plan.approvedAtUtc)} · source:{" "}
                {forecast.plan.sourceKind}. این داده Forecast است و Actual محسوب نمی‌شود.
              </p>
            ) : (
              <div className={styles.chartPlaceholder} role="status">
                <span>{report?.forecast?.reason ?? "Forecast canonical موجود نیست."}</span>
              </div>
            )}

            {forecast?.scenarios.map((scenario) => {
              const assumptions = forecast.assumptions.filter(
                (item) => item.scenario === scenario.scenario,
              );
              const chartText = `${scenarioTitle(scenario.scenario)}: ${scenario.months
                .map((month) => `${month.month} net burn ${month.netBurnMinor}`)
                .join("؛ ")}. ${scenarioRunwayText(scenario)}`;
              return (
                <article key={scenario.scenario} className={styles.scenarioPanel}>
                  <header className={styles.panelHeader}>
                    <div>
                      <p className="eyebrow">FORECAST · {scenario.scenario}</p>
                      <h4>{scenarioTitle(scenario.scenario)}</h4>
                    </div>
                    <span className={styles.badge}>FORECAST</span>
                  </header>
                  <div
                    className={styles.assumptionList}
                    aria-label={`فرض‌های ${scenarioTitle(scenario.scenario)}`}
                  >
                    {assumptions.map((assumption) => (
                      <p key={assumption.code}>
                        <strong>{assumption.label}:</strong> {assumption.value}
                      </p>
                    ))}
                  </div>
                  <div className={styles.forecastChart} role="img" aria-label={chartText}>
                    <span aria-hidden="true">{scenarioTitle(scenario.scenario)}</span>
                    <strong aria-hidden="true">
                      {scenarioRunwayText(scenario)} · پایان:{" "}
                      {money(scenario.projectedCash.endingCashMinor)}
                    </strong>
                  </div>
                  <div
                    className={styles.tableWrap}
                    role="region"
                    aria-label={`جدول ${scenarioTitle(scenario.scenario)}`}
                    tabIndex={0}
                  >
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">ماه</th>
                          <th scope="col">Revenue Forecast</th>
                          <th scope="col">Expense Forecast</th>
                          <th scope="col">Net Burn Forecast</th>
                          <th scope="col">Projected Cash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scenario.months.map((month, index) => (
                          <tr key={month.month}>
                            <th scope="row">{toPersianDigits(month.month)}</th>
                            <td>{money(month.revenueMinor)}</td>
                            <td>{money(month.expenseMinor)}</td>
                            <td>{money(month.netBurnMinor)}</td>
                            <td>
                              {money(
                                scenario.projectedCash.series[index]?.projectedEndingCashMinor,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </section>

          <p className={styles.footnote}>
            Actual و Forecast هرگز با هم ادغام نمی‌شوند. Runway تاریخی از observed cash و positive
            average net burn محاسبه می‌شود؛ سناریوهای آینده فقط از plan versioned canonical می‌آیند.
          </p>
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
