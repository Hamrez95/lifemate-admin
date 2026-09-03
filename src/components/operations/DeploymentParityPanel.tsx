import Link from "next/link";

import styles from "@/app/ops-settings.module.css";
import { shortGitSha } from "@/src/lib/deployment-status-contract";
import { getDeploymentStatus } from "@/src/lib/deployment-status";
import { formatPersianDateTime } from "@/src/lib/time-zone";

function parityCopy(state: "current" | "behind" | "ahead_or_unknown" | "unverifiable") {
  if (state === "current") return "نسخه پروداکشن با main هماهنگ است";
  if (state === "behind") return "نسخه پروداکشن عقب‌تر از main است";
  if (state === "ahead_or_unknown") return "نسخه پروداکشن با main قابل تطبیق قطعی نیست";
  return "وضعیت نسخه پروداکشن قابل تأیید نیست";
}

function parityBadge(state: "current" | "behind" | "ahead_or_unknown" | "unverifiable") {
  if (state === "current") return "Current";
  if (state === "behind") return "Behind";
  if (state === "ahead_or_unknown") return "Unknown history";
  return "Unverifiable";
}

export async function DeploymentParityPanel() {
  const status = await getDeploymentStatus();
  const isProduction = status.environment === "production";

  return (
    <section className={styles.panel} aria-labelledby="deployment-parity-title">
      <header className={styles.panelHeader}>
        <div>
          <p className="eyebrow">Production parity</p>
          <h3 id="deployment-parity-title">وضعیت نسخه واقعی Command Center</h3>
        </div>
        <span className={styles.badge}>
          {isProduction ? parityBadge(status.parityState) : "Preview / non-production"}
        </span>
      </header>

      <div className={styles.grid2}>
        <article className={styles.card}>
          <header className={styles.cardHeader}>
            <h3>{isProduction ? parityCopy(status.parityState) : "این اجرا Production نیست"}</h3>
            <span className={styles.badge}>{status.environment}</span>
          </header>
          <p>
            {isProduction
              ? "سلامت انتشار فقط با SHA دقیق سنجیده می‌شود؛ Preview جدیدتر به‌عنوان Production حساب نمی‌شود."
              : "SHA این deployment فقط برای QA این محیط است و نباید به‌عنوان وضعیت Production تفسیر شود."}
          </p>
          {status.limitation ? <p className={styles.helper}>{status.limitation}</p> : null}
        </article>

        <article className={styles.card}>
          <header className={styles.cardHeader}>
            <h3>مقایسه نسخه</h3>
            <Link href="/operations/releases">جزئیات انتشار</Link>
          </header>
          <p>
            deployed: <strong className={styles.codeSafe}>{shortGitSha(status.deployedSha)}</strong>
          </p>
          <p>
            current main:{" "}
            <strong className={styles.codeSafe}>{shortGitSha(status.expectedMainSha)}</strong>
          </p>
          <p>
            زمان deploy:{" "}
            {status.deployedAtUtc ? formatPersianDateTime(status.deployedAtUtc) : "ثبت نشده"}
          </p>
        </article>
      </div>

      <details>
        <summary>جزئیات فنی انتشار</summary>
        <div className={styles.list}>
          <div className={styles.row}>
            <span>Deployment ID</span>
            <strong className={styles.codeSafe}>{status.deploymentId ?? "نامشخص"}</strong>
          </div>
          <div className={styles.row}>
            <span>Rollback reference</span>
            <strong className={styles.codeSafe}>{status.rollbackReference ?? "ثبت نشده"}</strong>
          </div>
          <div className={styles.row}>
            <span>Migration compatibility</span>
            <strong>{status.migrationCompatibility}</strong>
          </div>
          <div className={styles.row}>
            <span>منبع current main</span>
            <strong>{status.mainSource}</strong>
          </div>
          <div className={styles.row}>
            <span>آخرین بررسی</span>
            <strong>{formatPersianDateTime(status.checkedAtUtc)}</strong>
          </div>
        </div>
      </details>
    </section>
  );
}
