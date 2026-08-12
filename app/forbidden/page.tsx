import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="standalone-state">
      <div className="standalone-state__card">
        <span aria-hidden="true">403</span>
        <h1>این حساب برای این بخش مجوز ندارد.</h1>
        <p>
          عضویت و permissionهای Command Center در سمت سرور بررسی می‌شوند. پنهان یا نمایش داده شدن
          منو کنترل امنیتی محسوب نمی‌شود.
        </p>
        <Link href="/">بازگشت به مرکز فرماندهی</Link>
      </div>
    </main>
  );
}
