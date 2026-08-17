import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./finance.module.css";

const financeCards = [
  { label: "درآمد واقعی", helper: "Actual revenue", tone: "mint" },
  { label: "هزینه واقعی", helper: "Actual expenses", tone: "peach" },
  { label: "سود / زیان خالص", helper: "Actual net result", tone: "blue" },
  { label: "پیش‌بینی", helper: "Forecast", tone: "lavender" },
] as const;

const expenseGroups = [
  "حقوق و مزایا",
  "بازاریابی",
  "زیرساخت و API",
  "دفتر و عملیات",
  "حقوقی و پیمانکاران",
];

export default async function FinancePage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("finance.read")) redirect("/forbidden");

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
                این صفحه فقط داده‌ای را نمایش می‌دهد که read model معتبر مالی آن را تأیید کرده باشد.
                نبود داده با صفر جایگزین نمی‌شود.
              </p>
            </div>
            <div className={styles.period} aria-label="بازه گزارش">
              <span>بازه گزارش</span>
              <strong>در انتظار منبع canonical</strong>
              <small>آخرین بروزرسانی: —</small>
            </div>
          </section>

          <section className={styles.stateBanner} role="status" aria-live="polite">
            <span className={styles.stateIcon} aria-hidden="true">
              i
            </span>
            <div>
              <strong>داده مالی هنوز برای این گزارش در دسترس نیست.</strong>
              <p>
                Production Admin API هنوز finance read model موردنیاز #41 را ارائه نمی‌کند. مقادیر
                Actual، Forecast، هزینه و سود خالص عمداً «—» نمایش داده می‌شوند.
              </p>
            </div>
          </section>

          <section className={styles.cardGrid} aria-label="شاخص‌های اصلی سود و زیان">
            {financeCards.map((card) => (
              <article key={card.label} className={`${styles.metricCard} ${styles[card.tone]}`}>
                <div className={styles.metricHeader}>
                  <span>{card.helper}</span>
                  <span className={styles.badge}>
                    {card.label === "پیش‌بینی" ? "FORECAST" : "ACTUAL"}
                  </span>
                </div>
                <strong aria-label={`${card.label} ناموجود`}>—</strong>
                <p>
                  {card.label === "پیش‌بینی"
                    ? "منبع forecast تأیید نشده"
                    : "منبع actual تأیید نشده"}
                </p>
              </article>
            ))}
          </section>

          <section className={styles.splitGrid}>
            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Actual</p>
                  <h3>ترکیب درآمد و هزینه</h3>
                </div>
                <span className={styles.sourcePill}>Source: unavailable</span>
              </header>
              <div
                className={styles.chartPlaceholder}
                role="img"
                aria-label="نمودار سود و زیان ناموجود است"
              >
                <span>نمودار پس از اتصال read model واقعی نمایش داده می‌شود.</span>
              </div>
            </article>

            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Expense structure</p>
                  <h3>گروه‌های هزینه</h3>
                </div>
              </header>
              <ul className={styles.expenseList}>
                {expenseGroups.map((group) => (
                  <li key={group}>
                    <span>{group}</span>
                    <strong>—</strong>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className={styles.panel} aria-labelledby="finance-table-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">P&amp;L statement</p>
                <h3 id="finance-table-title">صورت سود و زیان</h3>
              </div>
              <span className={styles.sourcePill}>Freshness: unavailable</span>
            </header>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">ردیف</th>
                    <th scope="col">Actual</th>
                    <th scope="col">Forecast</th>
                    <th scope="col">انحراف</th>
                    <th scope="col">منبع</th>
                  </tr>
                </thead>
                <tbody>
                  {["درآمد", "هزینه عملیاتی", "CAPEX", "سود / زیان عملیاتی", "سود / زیان خالص"].map(
                    (row) => (
                      <tr key={row}>
                        <th scope="row">{row}</th>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                        <td>
                          <span className={styles.unavailable}>ناموجود</span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <p className={styles.footnote}>
              واحد، currency، period boundary و calculation definition باید از قرارداد versioned
              سرور بیاید؛ UI آن‌ها را حدس نمی‌زند.
            </p>
          </section>
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
