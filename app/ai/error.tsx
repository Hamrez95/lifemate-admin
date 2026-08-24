"use client";

export default function AiError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" style={{ display: "grid", gap: "0.65rem", padding: "1rem" }}>
      <strong>خطا در بارگذاری بخش هوشمند.</strong>
      <span>هیچ پاسخ جایگزین یا داده حساسی نمایش داده نشد.</span>
      <button type="button" onClick={reset} style={{ minHeight: 44, width: "max-content" }}>
        تلاش دوباره
      </button>
    </div>
  );
}
