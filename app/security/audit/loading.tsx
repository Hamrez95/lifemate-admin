export default function AuditLoading() {
  return (
    <div className="page-state" role="status" aria-live="polite" aria-busy="true">
      <strong>در حال بارگذاری گزارش ممیزی…</strong>
      <span>رویدادهای canonical در حال دریافت هستند.</span>
    </div>
  );
}
