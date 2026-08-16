import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AdminDataTable,
  AdminPageState,
  type AdminTableColumn,
} from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getMarketingCampaigns,
  marketingCampaignStatuses,
  type MarketingCampaign,
  type MarketingCampaignList,
  type MarketingCampaignStatus,
} from "@/src/lib/admin-api/marketing-campaigns";
import { requireAdminAccess } from "@/src/lib/admin-api/server";
import { tehranDayBoundaryToUtc } from "@/src/lib/time-zone";

import { createCampaignAction, setCampaignStatusAction } from "./actions";
import styles from "./campaigns.module.css";

type CampaignPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const dateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
});
const numberFormat = new Intl.NumberFormat("fa-IR");

const statusLabels: Record<MarketingCampaignStatus, string> = {
  Draft: "پیش‌نویس",
  Ready: "آماده اجرا",
  Active: "فعال",
  Paused: "متوقف",
  Completed: "تکمیل‌شده",
  Cancelled: "لغوشده",
};

const transitions: Record<MarketingCampaignStatus, MarketingCampaignStatus[]> = {
  Draft: ["Ready", "Cancelled"],
  Ready: ["Draft", "Active", "Cancelled"],
  Active: ["Paused", "Completed", "Cancelled"],
  Paused: ["Active", "Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function boundedInteger(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function query(input: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  const page = boundedInteger(one(input.page), 1, 1, 100);
  const pageSize = boundedInteger(one(input.pageSize), 25, 5, 100);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  for (const key of ["q", "product", "channel", "status", "owner"] as const) {
    const value = one(input[key]).trim();
    if (value) params.set(key, value);
  }

  const from = one(input.from).trim();
  const to = one(input.to).trim();
  try {
    if (from) params.set("from", tehranDayBoundaryToUtc(from, "start"));
    if (to) params.set("to", tehranDayBoundaryToUtc(to, "end"));
  } catch {
    params.set("page", "101");
  }
  return params;
}

function hrefForPage(input: Record<string, string | string[] | undefined>, page: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  const pageSize = one(input.pageSize).trim();
  if (pageSize) params.set("pageSize", pageSize);
  for (const key of ["q", "product", "channel", "status", "owner", "from", "to"] as const) {
    const value = one(input[key]).trim();
    if (value) params.set(key, value);
  }
  return `/marketing/campaigns?${params.toString()}`;
}

function displayDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

function CampaignStatusControl({ campaign }: { campaign: MarketingCampaign }) {
  const next = transitions[campaign.status];
  if (next.length === 0) return <span className={styles.terminal}>پایان workflow</span>;

  return (
    <form action={setCampaignStatusAction} className={styles.statusForm}>
      <input type="hidden" name="campaignId" value={campaign.id} />
      <input type="hidden" name="idempotencyKey" value={`campaign-status-${crypto.randomUUID()}`} />
      <select name="status" aria-label={`وضعیت بعدی ${campaign.name}`} required>
        <option value="">انتخاب وضعیت…</option>
        {next.map((item) => (
          <option value={item} key={item}>
            {statusLabels[item]}
          </option>
        ))}
      </select>
      <input
        name="reason"
        minLength={10}
        maxLength={1000}
        placeholder="دلیل تغییر (حداقل ۱۰ نویسه)"
        aria-label={`دلیل تغییر وضعیت ${campaign.name}`}
        required
      />
      <button type="submit">اعمال</button>
    </form>
  );
}

function columns(canWrite: boolean): AdminTableColumn<MarketingCampaign>[] {
  const values: AdminTableColumn<MarketingCampaign>[] = [
    {
      key: "name",
      header: "کمپین",
      render: (row) => (
        <div className={styles.nameCell}>
          <Link href={`/marketing/campaigns/${row.id}`}>
            <strong>{row.name}</strong>
          </Link>
          <span>{row.objective ?? "بدون توضیح"}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      render: (row) => (
        <span className={styles.statusBadge} data-status={row.status}>
          {statusLabels[row.status]}
        </span>
      ),
    },
    { key: "product", header: "محصول", render: (row) => row.productCode },
    { key: "channel", header: "کانال", render: (row) => row.channelCode },
    {
      key: "window",
      header: "بازه",
      render: (row) => `${displayDate(row.startsAtUtc)} ← ${displayDate(row.endsAtUtc)}`,
    },
    {
      key: "owner",
      header: "مالک",
      render: (row) => (row.ownerAdminAccountId ? `${row.ownerAdminAccountId.slice(0, 8)}…` : null),
      hideOnMobile: true,
    },
  ];
  if (canWrite) {
    values.push({
      key: "workflow",
      header: "Workflow",
      render: (row) => <CampaignStatusControl campaign={row} />,
    });
  }
  return values;
}

function Summary({ report }: { report: MarketingCampaignList }) {
  const items: Array<[string, number, MarketingCampaignStatus | "All"]> = [
    ["کل", report.summary.total, "All"],
    ["پیش‌نویس", report.summary.draft, "Draft"],
    ["آماده", report.summary.ready, "Ready"],
    ["فعال", report.summary.active, "Active"],
    ["متوقف", report.summary.paused, "Paused"],
    ["تکمیل", report.summary.completed, "Completed"],
    ["لغوشده", report.summary.cancelled, "Cancelled"],
  ];
  return (
    <section className={styles.summary} aria-label="خلاصه workflow کمپین‌ها">
      {items.map(([label, value, state]) => (
        <article key={state} data-status={state}>
          <span>{label}</span>
          <strong>{numberFormat.format(value)}</strong>
        </article>
      ))}
    </section>
  );
}

function CreateCampaign() {
  return (
    <details className={styles.createCard}>
      <summary>+ ساخت کمپین جدید</summary>
      <form action={createCampaignAction} className={styles.createForm}>
        <input
          type="hidden"
          name="idempotencyKey"
          value={`campaign-create-${crypto.randomUUID()}`}
        />
        <label>
          <span>نام کمپین</span>
          <input name="name" minLength={2} maxLength={160} required />
        </label>
        <label>
          <span>هدف</span>
          <input name="objective" maxLength={500} />
        </label>
        <label>
          <span>محصول</span>
          <input name="productCode" placeholder="wellmate" pattern="[A-Za-z0-9_.:-]+" />
        </label>
        <label>
          <span>کانال برنامه‌ریزی</span>
          <input name="channelCode" placeholder="instagram" pattern="[A-Za-z0-9_.:-]+" />
        </label>
        <label>
          <span>شناسه مالک Admin</span>
          <input name="ownerAdminAccountId" placeholder="UUID اختیاری" />
        </label>
        <label>
          <span>شروع به وقت تهران</span>
          <input name="startsAt" type="datetime-local" />
        </label>
        <label>
          <span>پایان به وقت تهران</span>
          <input name="endsAt" type="datetime-local" />
        </label>
        <label className={styles.fullWidth}>
          <span>دلیل ایجاد</span>
          <textarea name="reason" minLength={10} maxLength={1000} required />
        </label>
        <button type="submit">ساخت Draft</button>
      </form>
    </details>
  );
}

export default async function CampaignsPage({ searchParams }: CampaignPageProps) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.read");
  const canWrite = admin.permissions.includes("marketing.campaign.write");
  const raw = await searchParams;
  const params = query(raw);
  const result = canRead ? await getMarketingCampaigns(params) : null;
  if (result?.kind === "unauthenticated") redirect("/login");
  const notice = one(raw.notice);
  const message = one(raw.message);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="کمپین‌ها"
        subtitle="Workflow عملیاتی کمپین؛ انتشار خارجی یک مرحله مستقل و انسانی است"
      >
        <div className={styles.page}>
          <header className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Campaign operations</p>
              <h2>از ایده تا اجرای کنترل‌شده، بدون auto-publish.</h2>
              <p>
                وضعیت کمپین با وضعیت انتشار شبکه اجتماعی یکی نیست. این صفحه lifecycle عملیاتی را
                مدیریت می‌کند؛ اتصال واقعی کانال و credential فقط در مرز جداگانه Channel Connections
                انجام می‌شود.
              </p>
            </div>
            <Link href="/marketing" className={styles.backLink}>
              بازگشت به Marketing Overview
            </Link>
          </header>

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
          ) : result?.kind === "invalid" ? (
            <AdminPageState
              state="error"
              title="فیلتر کمپین معتبر نیست"
              description={result.message}
            />
          ) : result?.kind === "forbidden" ? (
            <AdminPageState state="forbidden" />
          ) : result?.kind === "unavailable" ? (
            <AdminPageState
              state="unavailable"
              description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
            />
          ) : result?.kind === "ok" ? (
            <>
              <Summary report={result.data} />
              {canWrite ? <CreateCampaign /> : null}
              <AdminDataTable
                title="فهرست کمپین‌ها"
                description="جست‌وجو و فیلتر سمت سرور، حداکثر ۱۰۰ صفحه و ۱۰۰ ردیف در صفحه."
                rows={result.data.items}
                columns={columns(canWrite)}
                rowKey={(row) => row.id}
                total={result.data.total}
                freshness={{
                  status: result.data.freshness.status,
                  label: `منبع: ${result.data.freshness.source} · ${displayDate(result.data.freshness.asOfUtc)}`,
                }}
                toolbar={
                  <form method="get" className={styles.filters} aria-label="فیلتر کمپین‌ها">
                    <input name="q" defaultValue={one(raw.q)} placeholder="جست‌وجوی نام یا هدف" />
                    <input name="product" defaultValue={one(raw.product)} placeholder="محصول" />
                    <input name="channel" defaultValue={one(raw.channel)} placeholder="کانال" />
                    <select name="status" defaultValue={one(raw.status)}>
                      <option value="">همه وضعیت‌ها</option>
                      {marketingCampaignStatuses.map((item) => (
                        <option value={item} key={item}>
                          {statusLabels[item]}
                        </option>
                      ))}
                    </select>
                    <input name="owner" defaultValue={one(raw.owner)} placeholder="Owner UUID" />
                    <input
                      type="date"
                      name="from"
                      defaultValue={one(raw.from)}
                      aria-label="از تاریخ شروع"
                    />
                    <input
                      type="date"
                      name="to"
                      defaultValue={one(raw.to)}
                      aria-label="تا تاریخ شروع"
                    />
                    <button type="submit">اعمال فیلتر</button>
                  </form>
                }
                pagination={{
                  page: result.data.page,
                  pageSize: result.data.pageSize,
                  total: result.data.total,
                  previousHref:
                    result.data.page > 1 ? hrefForPage(raw, result.data.page - 1) : undefined,
                  nextHref:
                    result.data.page * result.data.pageSize < result.data.total &&
                    result.data.page < 100
                      ? hrefForPage(raw, result.data.page + 1)
                      : undefined,
                }}
              />
            </>
          ) : (
            <AdminPageState state="unavailable" />
          )}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
