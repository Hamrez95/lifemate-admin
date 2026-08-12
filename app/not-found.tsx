import Link from "next/link";

export default function NotFound() {
  return (
    <main className="standalone-state">
      <div className="standalone-state__card">
        <span aria-hidden="true">404</span>
        <h1>این بخش در Command Center تعریف نشده است.</h1>
        <p>برای ادامه به مرکز فرماندهی برگردید.</p>
        <Link href="/">بازگشت به مرکز فرماندهی</Link>
      </div>
    </main>
  );
}
