"use client";

export default function CommandCenterError({ reset }: { reset: () => void }) {
  return (
    <main className="standalone-state">
      <div className="standalone-state__card">
        <span aria-hidden="true">!</span>
        <h1>سرویس مدیریت در دسترس نیست.</h1>
        <p>
          برای امنیت، Command Center در صورت خطای Auth یا Admin API به داده‌ی مستقیم دیتابیس fallback
          نمی‌کند.
        </p>
        <button className="primary-button" type="button" onClick={reset}>
          تلاش دوباره
        </button>
      </div>
    </main>
  );
}
