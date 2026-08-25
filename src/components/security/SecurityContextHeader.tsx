import Image from "next/image";
import Link from "next/link";

import styles from "./security-context-header.module.css";

export function SecurityContextHeader() {
  return (
    <section className={styles.hero} aria-labelledby="security-context-title">
      <div className={styles.copy}>
        <p className="eyebrow">SECURITY · PRIVACY · IMMUTABLE AUDIT</p>
        <h2 id="security-context-title">امنیت، حریم خصوصی و کنترل دسترسی</h2>
        <p>
          این workspace فقط قراردادهای canonical سمت سرور را نمایش می‌دهد. دسترسی حساس با
          default-deny، RBAC و AAL2 کنترل می‌شود و هیچ secret، credential یا داده پزشکی خام در این
          نما نمایش داده نمی‌شود.
        </p>
        <nav className={styles.nav} aria-label="بخش‌های امنیت">
          <Link href="/security">Roles &amp; Permissions</Link>
          <Link href="/security/audit">Audit</Link>
        </nav>
        <div className={styles.guardrails} aria-label="مرزهای امنیتی ثابت">
          <span>Founder role immutable</span>
          <span>Self-escalation blocked</span>
          <span>Reason + Idempotency + Audit</span>
        </div>
      </div>
      <div className={styles.art} aria-hidden="true">
        <Image
          src="/design-assets/security-audit-hero-v1.png"
          alt=""
          width={1536}
          height={1024}
          sizes="(max-width: 390px) 44vw, (max-width: 768px) 36vw, 300px"
        />
      </div>
    </section>
  );
}
