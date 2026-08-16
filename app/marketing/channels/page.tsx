import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getMarketingChannels,
  type MarketingChannel,
  type MarketingChannelSetupStatus,
} from "@/src/lib/admin-api/marketing-channels";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { setChannelStatusAction } from "./actions";
import styles from "./channels.module.css";

type ChannelPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const dateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});

const setupLabels: Record<MarketingChannelSetupStatus, string> = {
  SetupRequired: "نیازمند تنظیم امن",
  CredentialAvailable: "Credential موجود",
  Disabled: "غیرفعال",
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function ChannelCard({
  channel,
  canControl,
}: {
  channel: MarketingChannel;
  canControl: boolean;
}) {
  const nextEnabled = channel.operatorStatus === "Disabled";
  return (
    <article className={styles.channelCard} data-state={channel.setupStatus}>
      <div className={styles.channelHead}>
        <div className={styles.providerMark} aria-hidden="true">
          {channel.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h3>{channel.displayName}</h3>
          <code>{channel.providerCode}</code>
        </div>
        <span className={styles.stateBadge}>{setupLabels[channel.setupStatus]}</span>
      </div>

      <dl className={styles.meta}>
        <div>
          <dt>وضعیت عملیاتی</dt>
          <dd>{channel.operatorStatus === "Enabled" ? "فعال" : "غیرفعال"}</dd>
        </div>
        <div>
          <dt>Credential</dt>
          <dd>{channel.credentialAvailable ? "موجود در Vault" : "ثبت نشده"}</dd>
        </div>
        <div>
          <dt>Provider connectivity</dt>
          <dd>بررسی نشده</dd>
        </div>
        <div>
          <dt>آخرین تغییر</dt>
          <dd>{dateFormat.format(new Date(channel.updatedAtUtc))}</dd>
        </div>
      </dl>

      <div className={styles.truthBox}>
        {channel.setupStatus === "CredentialAvailable"
          ? "Credential روی سرور موجود است؛ این به معنی اتصال یا سلامت API شبکه اجتماعی نیست."
          : channel.setupStatus === "SetupRequired"
            ? "هیچ Credential قابل استفاده‌ای در Vault شناسایی نشده است؛ انتشار باید fail-closed بماند."
            : "کانال توسط اپراتور غیرفعال است؛ حتی وجود Credential نیز اجازه انتشار نمی‌دهد."}
      </div>

      {canControl ? (
        <form action={setChannelStatusAction} className={styles.controlForm}>
          <input type="hidden" name="providerCode" value={channel.providerCode} />
          <input type="hidden" name="enabled" value={String(nextEnabled)} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={`channel-status-${channel.providerCode}-${crypto.randomUUID()}`}
          />
          <label>
            <span>دلیل تغییر</span>
            <input
              name="reason"
              minLength={10}
              maxLength={1000}
              placeholder={
                nextEnabled
                  ? "دلیل فعال‌سازی مجدد کانال"
                  : "دلیل توقف انتشار از این کانال"
              }
              required
            />
          </label>
          <button type="submit" data-action={nextEnabled ? "enable" : "disable"}>
            {nextEnabled ? "فعال‌سازی operational" : "غیرفعال‌سازی فوری"}
          </button>
        </form>
      ) : (
        <p className={styles.readOnlyNote}>
          کنترل وضعیت به permission پرریسک `marketing.social.publish` نیاز دارد.
        </p>
      )}
    </article>
  );
}

export default async function MarketingChannelsPage({ searchParams }: ChannelPageProps) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.read");
  const canControl = admin.permissions.includes("marketing.social.publish");
  const result = canRead ? await getMarketingChannels() : null;
  if (result?.kind === "unauthenticated") redirect("/login");

  const raw = await searchParams;
  const notice = one(raw.notice);
  const message = one(raw.message);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="اتصال کانال‌ها"
        subtitle="وضعیت امن integration بدون نمایش token، secret یا payload شبکه اجتماعی"
      >
        <div className={styles.page}>
          <section className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Secure channel boundary</p>
              <h2>قبل از Publish، اول باید بدانیم واقعاً چه چیزی آماده است.</h2>
              <p>
                این صفحه فقط وضعیت operational و وجود Credential را نشان می‌دهد. مقدار Credential،
                OAuth token و provider payload هرگز به مرورگر فرستاده نمی‌شود و «Credential موجود»
                مساوی «Connected» نیست.
              </p>
            </div>
            <div className={styles.heroActions}>
              <Link href="/marketing/campaigns">کمپین‌ها</Link>
              <Link href="/marketing">Marketing Overview</Link>
            </div>
          </section>

          {notice && message ? (
            <div
              className={styles.notice}
              data-kind={notice}
              role={notice === "error" ? "alert" : "status"}
            >
              {message}
            </div>
          ) : null}

          {!canRead ? (
            <AdminPageState state="forbidden" />
          ) : result?.kind === "forbidden" ? (
            <AdminPageState state="forbidden" />
          ) : result?.kind === "unavailable" ? (
            <AdminPageState
              state="unavailable"
              description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
            />
          ) : result?.kind === "ok" && result.data.items.length === 0 ? (
            <AdminPageState
              state="empty"
              title="کانالی در catalog ثبت نشده"
              description="هیچ اتصال نمایشی ساخته نمی‌شود؛ ابتدا integration catalog باید در سرور تعریف شود."
            />
          ) : result?.kind === "ok" ? (
            <>
              <div className={styles.legend} aria-label="تعریف وضعیت کانال‌ها">
                <span>SetupRequired = Credential وجود ندارد</span>
                <span>CredentialAvailable = secret فقط روی سرور موجود است</span>
                <span>Disabled = kill switch عملیاتی فعال است</span>
                <span>Provider connectivity = هنوز verify نشده</span>
              </div>
              <section className={styles.grid} aria-label="وضعیت کانال‌های Marketing">
                {result.data.items.map((channel) => (
                  <ChannelCard
                    channel={channel}
                    canControl={canControl}
                    key={channel.providerCode}
                  />
                ))}
              </section>
              <p className={styles.freshness}>
                منبع: {result.data.freshness.source} · آخرین خواندن:{" "}
                {dateFormat.format(new Date(result.data.freshness.asOfUtc))}
              </p>
            </>
          ) : (
            <AdminPageState state="unavailable" />
          )}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
