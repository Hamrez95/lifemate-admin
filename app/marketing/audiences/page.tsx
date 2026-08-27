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
  getAudienceSegments,
  getSegmentCapabilities,
  type AudienceSegment,
  type SegmentAttribute,
  type SegmentOperator,
} from "@/src/lib/admin-api/audience-segments";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import {
  createAudienceSegmentAction,
  previewAudienceSegmentAction,
  snapshotAudienceSegmentAction,
} from "./actions";
import styles from "./audiences.module.css";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const dateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});

const attributeLabels: Record<SegmentAttribute, string> = {
  "demographic.locale": "Locale",
  "product.code": "Product code",
  "product.enrolled": "Product enrollment",
  "subscription.status": "Subscription status",
  "entitlement.code": "Entitlement code",
  "engagement.lifecycle": "Engagement lifecycle",
  "engagement.last_active_days": "Days since last activity",
};

const operatorLabels: Record<SegmentOperator, string> = {
  eq: "برابر",
  neq: "نابرابر",
  in: "یکی از",
  not_in: "هیچ‌کدام",
  gte: "بزرگ‌تر/مساوی",
  lte: "کوچک‌تر/مساوی",
  exists: "وجود دارد",
};

const selectableAttributes = Object.keys(attributeLabels) as SegmentAttribute[];
const selectableOperators = Object.keys(operatorLabels) as SegmentOperator[];

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function displayDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

function ruleSummary(segment: AudienceSegment): string {
  return segment.ruleSet.rules
    .map((rule) => {
      const label = attributeLabels[rule.attribute] ?? rule.attribute;
      const operator = operatorLabels[rule.operator] ?? rule.operator;
      const value = rule.value === undefined
        ? ""
        : Array.isArray(rule.value)
        ? rule.value.join(", ")
        : String(rule.value);
      return `${label} · ${operator}${value ? ` · ${value}` : ""}`;
    })
    .join(segment.ruleSet.match === "all" ? " AND " : " OR ");
}

function SegmentActions({ segment }: { segment: AudienceSegment }) {
  if (segment.status !== "Active") {
    return <span className={styles.meta}>Archived</span>;
  }
  return (
    <div className={styles.actions}>
      <form action={previewAudienceSegmentAction} className={`${styles.action} ${styles.secondary}`}>
        <input type="hidden" name="segmentId" value={segment.id} />
        <button type="submit">Preview</button>
      </form>
      <form action={snapshotAudienceSegmentAction} className={styles.action}>
        <input type="hidden" name="segmentId" value={segment.id} />
        <input type="hidden" name="version" value={segment.version} />
        <input
          type="hidden"
          name="idempotencyKey"
          value={`segment-snapshot-${crypto.randomUUID()}`}
        />
        <button type="submit">Snapshot</button>
      </form>
    </div>
  );
}

function columns(canWrite: boolean): AdminTableColumn<AudienceSegment>[] {
  return [
    {
      key: "name",
      header: "Segment",
      render: (row) => (
        <div className={styles.name}>
          <strong>{row.name}</strong>
          <span>{row.key}</span>
          {row.description ? <span>{row.description}</span> : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      render: (row) => `${row.status} · v${row.version}`,
    },
    {
      key: "rules",
      header: "قواعد canonical",
      render: (row) => <span className={styles.rule}>{ruleSummary(row)}</span>,
    },
    {
      key: "updated",
      header: "آخرین تغییر",
      render: (row) => displayDate(row.updatedAtUtc),
      hideOnMobile: true,
    },
    ...(canWrite
      ? [{
          key: "actions",
          header: "اجرا",
          render: (row: AudienceSegment) => <SegmentActions segment={row} />,
        } satisfies AdminTableColumn<AudienceSegment>]
      : []),
  ];
}

function CreateSegment() {
  return (
    <details className={styles.create}>
      <summary>+ ساخت Segment جدید</summary>
      <form action={createAudienceSegmentAction} className={styles.form}>
        <input
          type="hidden"
          name="idempotencyKey"
          value={`segment-create-${crypto.randomUUID()}`}
        />
        <label>
          <span>کلید ثابت</span>
          <input name="key" placeholder="wellmate.active_users" required />
        </label>
        <label>
          <span>نام</span>
          <input name="name" minLength={2} maxLength={120} required />
        </label>
        <label className={styles.full}>
          <span>توضیح</span>
          <textarea name="description" maxLength={500} />
        </label>
        <label>
          <span>منطق Rule Set</span>
          <select name="match" defaultValue="all">
            <option value="all">همه شرط‌ها (AND)</option>
            <option value="any">حداقل یک شرط (OR)</option>
          </select>
        </label>
        <label>
          <span>Attribute مجاز</span>
          <select name="attribute" defaultValue="product.code" required>
            {selectableAttributes.map((attribute) => (
              <option value={attribute} key={attribute}>
                {attributeLabels[attribute]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Operator</span>
          <select name="operator" defaultValue="eq" required>
            {selectableOperators.map((operator) => (
              <option value={operator} key={operator}>
                {operatorLabels[operator]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>مقدار</span>
          <input
            name="value"
            placeholder="مثلاً wellmate یا active_30d؛ برای exists خالی"
          />
        </label>
        <div className={styles.full}>
          <button type="submit">ساخت Segment</button>
        </div>
      </form>
    </details>
  );
}

export default async function AudienceStudioPage({ searchParams }: PageProps) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.segment.read");
  const canWrite = admin.permissions.includes("marketing.segment.write");
  const raw = await searchParams;
  const [segments, capabilities] = canRead
    ? await Promise.all([getAudienceSegments(), getSegmentCapabilities()])
    : [null, null];
  if (segments?.kind === "unauthenticated" || capabilities?.kind === "unauthenticated") {
    redirect("/login");
  }
  const notice = one(raw.notice);
  const message = one(raw.message);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="Audience Studio"
        subtitle="Dynamic Segment → privacy-safe Preview → immutable execution Snapshot"
      >
        <div className={styles.page}>
          <header className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>Audience Segmentation · Canonical Core</span>
              <h2>Audience را یک‌بار تعریف کن؛ Campaign فقط از Snapshot نسخه‌دار استفاده کند.</h2>
              <p>
                Segmentها از projectionهای canonical Account/Person/Product/Subscription/Engagement
                ساخته می‌شوند. شمارش کوچک privacy-suppressed است و Snapshot برای execution تغییرناپذیر می‌ماند.
              </p>
            </div>
            <Link className={styles.back} href="/marketing/campaigns">
              رفتن به Campaigns
            </Link>
          </header>

          <section className={styles.guardrail} aria-label="مرز داده Marketing">
            <strong>مرز غیرقابل‌عبور Marketing</strong>
            <p>
              Health، medication، diagnosis، treatment، Women Health و cycle data در Segment Builder
              ارائه نمی‌شوند. نوع رابطه یا داده سلامت هیچ‌وقت به‌عنوان permission یا targeting shortcut
              استفاده نمی‌شود.
            </p>
          </section>

          {notice && message ? (
            <div className={styles.notice} data-kind={notice} role={notice === "error" ? "alert" : "status"}>
              {message}
            </div>
          ) : null}

          {!canRead ? (
            <AdminPageState state="forbidden" />
          ) : segments?.kind === "forbidden" || capabilities?.kind === "forbidden" ? (
            <AdminPageState state="forbidden" />
          ) : segments?.kind === "unavailable" || capabilities?.kind === "unavailable" ? (
            <AdminPageState state="unavailable" />
          ) : segments?.kind === "ok" && capabilities?.kind === "ok" ? (
            <>
              <section className={styles.guardrail} aria-label="قابلیت‌های منبع canonical">
                <strong>Attributes قابل ارزیابی الان</strong>
                <div className={styles.capabilities}>
                  {capabilities.data.supportedAttributes.map((attribute) => (
                    <span className={styles.chip} key={attribute}>{attribute}</span>
                  ))}
                  {capabilities.data.unavailableAttributes.map((attribute) => (
                    <span className={`${styles.chip} ${styles.unavailable}`} key={attribute}>
                      {attribute} · unavailable
                    </span>
                  ))}
                </div>
                <p>
                  حداقل cohort برای نمایش شمارش دقیق: {capabilities.data.minimumPreviewCohort}. منبعی که
                  canonical نیست در UI قابل انتخاب نمی‌شود و سیستم مقدار ساختگی تولید نمی‌کند.
                </p>
              </section>
              {canWrite ? <CreateSegment /> : null}
              <AdminDataTable
                title="Reusable Audience Segments"
                description="Preview شمارش را از Core می‌گیرد؛ Snapshot فقط از نسخه Active و exact-version ساخته می‌شود."
                rows={segments.data}
                columns={columns(canWrite)}
                rowKey={(row) => row.id}
                total={segments.data.length}
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
