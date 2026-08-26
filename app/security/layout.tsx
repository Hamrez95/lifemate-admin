import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./security-layout.module.css";

export default function SecurityLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.securityArea}>
      <section className={styles.hero} aria-labelledby="security-area-title">
        <div className={styles.copy}>
          <p className="eyebrow">SECURITY · PRIVACY · IMMUTABLE AUDIT</p>
          <h2 id="security-area-title">مرکز امنیت و حریم خصوصی</h2>
          <p>
            نقش‌ها، مجوزها و رویدادهای ممیزی فقط از قراردادهای canonical سمت سرور خوانده می‌شوند.
            تغییر حساس بدون AAL2، RBAC، دلیل، idempotency و audit معتبر انجام نمی‌شود.
          </p>
          <nav className={styles.nav} aria-label="ناوبری امنیت و ممیزی">
            <Link href="/security">Roles &amp; Permissions</Link>
            <Link href="/security/staff">Staff Console</Link>
            <Link href="/security/break-glass">Break-glass</Link>
            <Link href="/security/audit">Audit</Link>
          </nav>
        </div>
        <div className={styles.art} aria-hidden="true">
          <Image
            src="/design-assets/security-audit-hero-v1.png"
            alt=""
            width={1536}
            height={1024}
            sizes="(max-width: 768px) 42vw, 300px"
          />
        </div>
      </section>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
