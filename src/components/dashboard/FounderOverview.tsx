const metricPlaceholders = [
  { label: "کل حساب‌ها", helper: "تعریف KPI در PR اندازه‌گیری", tone: "green" },
  { label: "کاربران فعال", helper: "نیازمند Event Taxonomy", tone: "blue" },
  { label: "روابط فعال", helper: "پس از ساخت read model", tone: "violet" },
  { label: "کاربران پرداخت‌کننده", helper: "بر پایه subscription معتبر", tone: "orange" },
] as const;

const readinessItems = [
  ["رابط و Design Tokens", "آماده در این PR", "ready"],
  ["احراز هویت مدیر", "PR بعدی", "next"],
  ["RBAC سمت سرور", "PR بعدی", "next"],
  ["KPI Dictionary", "فاز اندازه‌گیری", "planned"],
] as const;

export function FounderOverview() {
  return (
    <div className="dashboard-stack">
      <section className="notice-banner" aria-labelledby="foundation-notice-title">
        <div className="notice-banner__icon" aria-hidden="true">♡</div>
        <div><p className="eyebrow">Foundation mode</p><h2 id="foundation-notice-title">داده واقعی هنوز به این داشبورد متصل نشده است.</h2><p>این صفحه ساختار، زبان بصری و حالت‌های ایمن Command Center را پیاده می‌کند؛ تا قبل از Event/KPI foundation هیچ عدد نمایشی به عنوان واقعیت کسب‌وکار نشان داده نمی‌شود.</p></div>
      </section>
      <section className="section-card" aria-labelledby="ecosystem-pulse-title">
        <div className="section-card__header"><div><p className="eyebrow">نمای مدیریتی قابل اعتماد</p><h2 id="ecosystem-pulse-title">پالس اکوسیستم</h2></div><span className="state-pill state-pill--safe">بدون داده ساختگی</span></div>
        <div className="metric-grid">{metricPlaceholders.map((metric) => <article className="metric-card" data-tone={metric.tone} key={metric.label}><div className="metric-card__topline"><span className="metric-card__icon" aria-hidden="true">◌</span><span>{metric.label}</span></div><strong className="metric-card__value" aria-label={`${metric.label}: هنوز محاسبه نشده`}>—</strong><p>{metric.helper}</p><div className="sparkline-placeholder" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div></article>)}</div>
      </section>
      <div className="dashboard-grid dashboard-grid--wide">
        <section className="section-card" aria-labelledby="advisor-title"><div className="section-card__header"><div><p className="eyebrow">AI Advisor</p><h2 id="advisor-title">گزارش روزانه هوش مصنوعی</h2></div><span className="state-pill">Read-only</span></div><div className="empty-state empty-state--violet"><span className="empty-state__symbol" aria-hidden="true">✦</span><h3>هنوز Business Tool متصل نیست</h3><p>نسخه اول AI فقط از ابزارهای مجاز و داده‌های تجمیعی استفاده خواهد کرد و هیچ دسترسی مستقیم به دیتابیس یا health record خام نخواهد داشت.</p></div></section>
        <section className="section-card" aria-labelledby="readiness-title"><div className="section-card__header"><div><p className="eyebrow">Build status</p><h2 id="readiness-title">آمادگی Command Center</h2></div></div><ul className="readiness-list">{readinessItems.map(([label, value, state]) => <li key={label}><span className="readiness-list__marker" data-state={state} aria-hidden="true" /><span><strong>{label}</strong><small>{value}</small></span></li>)}</ul></section>
      </div>
      <section className="section-card" aria-labelledby="decisions-title"><div className="section-card__header"><div><p className="eyebrow">Human approval first</p><h2 id="decisions-title">تصمیم‌های حساس</h2></div></div><div className="decision-strip"><article><span className="decision-strip__badge">RBAC</span><h3>دسترسی بر اساس capability</h3><p>پنهان‌کردن منو جایگزین مجوز سمت سرور نخواهد شد.</p></article><article><span className="decision-strip__badge">Privacy</span><h3>سلامت پنهان به‌صورت پیش‌فرض</h3><p>برای health data خام، flow محدود و audit شده طراحی می‌شود.</p></article><article><span className="decision-strip__badge">AI</span><h3>شروع فقط با READ</h3><p>AI در نسخه اول اجازه suspend، refund، publish یا تغییر مالی ندارد.</p></article></div></section>
    </div>
  );
}
