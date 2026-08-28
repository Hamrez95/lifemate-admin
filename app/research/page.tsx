import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  listResearchDatasets,
  listResearchExports,
  previewResearchDataset,
  type ResearchDataset,
  type ResearchExportJob,
} from "@/src/lib/admin-api/research-studio";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { createDatasetAction, requestExportAction } from "./actions";
import styles from "./research.module.css";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const kindLabels: Record<string, string> = {
  HealthObservationAggregate: "Health Observation Aggregate",
  DoseAdherenceAggregate: "Dose Adherence Aggregate",
  TreatmentAggregate: "Treatment Aggregate",
  WomenCycleAggregate: "Women Cycle Aggregate",
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function statusMessage(value: string): string | null {
  if (value === "created") return "Dataset با policy مشخص ساخته شد.";
  if (value === "export_requested")
    return "Export job ثبت شد و قبل از تولید دوباره privacy checks را اجرا می‌کند.";
  if (value === "invalid") return "درخواست معتبر نبود یا policy privacy آن رد شد.";
  if (value === "forbidden") return "Research Studio فقط برای Founder در دسترس است.";
  if (value === "unavailable")
    return "Research API فعلاً در دسترس نیست؛ هیچ fallback مستقیم به دیتابیس انجام نشد.";
  return null;
}

function scalarPreview(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `${value.length.toLocaleString("fa-IR")} مورد`;
  return "جزئیات ساختاریافته";
}

function DatasetCard({ dataset, selected }: { dataset: ResearchDataset; selected: boolean }) {
  return (
    <article className={styles.datasetCard} data-selected={selected ? "true" : "false"}>
      <div className={styles.cardHeader}>
        <div>
          <strong>{dataset.name}</strong>
          <span>{kindLabels[dataset.datasetKind] ?? dataset.datasetKind}</span>
        </div>
        <span className={styles.statusBadge}>{dataset.status}</span>
      </div>
      <dl className={styles.policyGrid}>
        <div>
          <dt>Purpose</dt>
          <dd>{dataset.purpose}</dd>
        </div>
        <div>
          <dt>Policy version</dt>
          <dd>v{dataset.privacyPolicyVersion.toLocaleString("fa-IR")}</dd>
        </div>
        <div>
          <dt>Minimum cohort</dt>
          <dd>{dataset.minimumCohortSize.toLocaleString("fa-IR")}</dd>
        </div>
        <div>
          <dt>Small-cell threshold</dt>
          <dd>{dataset.smallCellThreshold.toLocaleString("fa-IR")}</dd>
        </div>
        <div>
          <dt>Age bucket</dt>
          <dd>
            {dataset.ageBucketYears == null
              ? "غیرفعال"
              : `${dataset.ageBucketYears.toLocaleString("fa-IR")} سال`}
          </dd>
        </div>
        <div>
          <dt>Row mode</dt>
          <dd>{dataset.rowMode}</dd>
        </div>
      </dl>
      <Link
        className={styles.secondaryAction}
        href={`/research?dataset=${encodeURIComponent(dataset.datasetId)}`}
      >
        Privacy Preview و Export
      </Link>
    </article>
  );
}

function ExportRow({ job }: { job: ResearchExportJob }) {
  const canDownload = job.status === "Completed" && job.artifactSha256 && job.artifactExpiresAtUtc;
  return (
    <tr>
      <td>{job.format}</td>
      <td>{job.status}</td>
      <td>{job.cohortSize == null ? "—" : job.cohortSize.toLocaleString("fa-IR")}</td>
      <td>{job.privacyPolicyVersion.toLocaleString("fa-IR")}</td>
      <td className={styles.hashCell}>{job.artifactSha256 ?? job.reasonCode ?? "—"}</td>
      <td>
        {canDownload ? (
          <Link href={`/research/download/${encodeURIComponent(job.jobId)}`}>دانلود امن</Link>
        ) : (
          <span>—</span>
        )}
      </td>
    </tr>
  );
}

async function ResearchContent({ selectedId }: { selectedId: string }) {
  const datasetsResult = await listResearchDatasets();
  if (datasetsResult.kind === "unauthenticated") redirect("/login");
  if (datasetsResult.kind === "forbidden") {
    return (
      <AdminPageState state="forbidden" title="Research Studio فقط برای Founder در دسترس است" />
    );
  }
  if (datasetsResult.kind !== "ok") {
    return (
      <AdminPageState
        state="unavailable"
        title="Research Dataset API در دسترس نیست"
        description="هیچ دسترسی مستقیم دیتابیس یا export-all fallback فعال نمی‌شود."
      />
    );
  }

  const datasets = datasetsResult.data.items;
  const selected = datasets.find((item) => item.datasetId === selectedId) ?? null;
  const previewResult = selected ? await previewResearchDataset(selected.datasetId) : null;
  const exportsResult = selected ? await listResearchExports(selected.datasetId) : null;

  return (
    <div className={styles.content}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Founder-only · Privacy controlled</span>
          <h2>Research Dataset Builder</h2>
          <p>
            Datasetها فقط از queryهای allow-listed Core ساخته می‌شوند. Direct identifiers رد
            می‌شوند، cohortهای کوچک suppress می‌شوند و export قبل از تولید دوباره policy را
            revalidate می‌کند.
          </p>
        </div>
        <div className={styles.heroRules}>
          <span>No raw export-all</span>
          <span>CSV/XLSX via canonical export jobs</span>
          <span>Signed, expiring downloads</span>
        </div>
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Dataset definition</span>
              <h3>ساخت Dataset جدید</h3>
            </div>
          </div>
          <form action={createDatasetAction} className={styles.formGrid}>
            <input
              type="hidden"
              name="idempotencyKey"
              value={`research-dataset-${randomUUID()}`}
            />
            <label className={styles.wideField}>
              <span>نام Dataset</span>
              <input
                name="name"
                minLength={3}
                maxLength={160}
                required
                placeholder="adherence-cohort-q3"
              />
            </label>
            <label>
              <span>نوع Dataset</span>
              <select name="datasetKind" defaultValue="DoseAdherenceAggregate">
                {Object.entries(kindLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Purpose code</span>
              <input
                name="purpose"
                required
                pattern="[a-z][a-z0-9._-]{2,79}"
                defaultValue="research.product_learning"
              />
            </label>
            <label>
              <span>Source category</span>
              <input
                name="sourceCategory"
                required
                pattern="[A-Za-z][A-Za-z0-9_-]{2,79}"
                defaultValue="ProductResearch"
              />
            </label>
            <label>
              <span>Age bucket (سال)</span>
              <input name="ageBucketYears" type="number" min={2} max={20} defaultValue={2} />
            </label>
            <label>
              <span>Minimum cohort</span>
              <input
                name="minimumCohortSize"
                type="number"
                min={10}
                max={1000000}
                defaultValue={20}
                required
              />
            </label>
            <label>
              <span>Small-cell threshold</span>
              <input
                name="smallCellThreshold"
                type="number"
                min={5}
                max={1000000}
                defaultValue={10}
                required
              />
            </label>
            <label>
              <span>از تاریخ</span>
              <input name="from" type="date" />
            </label>
            <label>
              <span>تا تاریخ</span>
              <input name="to" type="date" />
            </label>
            <label>
              <span>حداقل سن</span>
              <input name="ageMin" type="number" min={0} max={130} />
            </label>
            <label>
              <span>حداکثر سن</span>
              <input name="ageMax" type="number" min={0} max={130} />
            </label>
            <div className={styles.wideField}>
              <p className={styles.formNote}>
                Row-level pseudonymous export در UI فعال نیست؛ تا زمانی که policy/implementation
                مربوط صریحاً مجاز و evidence-complete نباشد، Aggregate تنها حالت قابل ساخت است.
              </p>
              <button type="submit">ساخت Dataset با policy</button>
            </div>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Saved definitions</span>
              <h3>Datasetها</h3>
            </div>
            <span>{datasets.length.toLocaleString("fa-IR")}</span>
          </div>
          {datasets.length === 0 ? (
            <AdminPageState state="empty" title="هنوز Datasetی ساخته نشده" />
          ) : (
            <div className={styles.datasetList}>
              {datasets.map((dataset) => (
                <DatasetCard
                  key={dataset.datasetId}
                  dataset={dataset}
                  selected={dataset.datasetId === selectedId}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selected ? (
        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Privacy check before export</span>
              <h3>{selected.name}</h3>
            </div>
            <span>Dataset v{selected.datasetVersion.toLocaleString("fa-IR")}</span>
          </div>

          {previewResult?.kind === "ok" ? (
            <div className={styles.previewGrid}>
              {Object.entries(previewResult.data.preview).map(([key, value]) => (
                <div key={key} className={styles.previewItem}>
                  <span>{key}</span>
                  <strong>{scalarPreview(value)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <AdminPageState
              state="unavailable"
              title="Privacy Preview در دسترس نیست"
              description="تا زمان موفقیت preview هیچ export جدیدی نباید به‌عنوان ایمن فرض شود."
            />
          )}

          <div className={styles.exportControls}>
            <form action={requestExportAction}>
              <input type="hidden" name="datasetId" value={selected.datasetId} />
              <input
                type="hidden"
                name="idempotencyKey"
                value={`research-export-csv-${randomUUID()}`}
              />
              <input type="hidden" name="format" value="CSV" />
              <button type="submit" disabled={previewResult?.kind !== "ok"}>
                درخواست CSV
              </button>
            </form>
            <form action={requestExportAction}>
              <input type="hidden" name="datasetId" value={selected.datasetId} />
              <input
                type="hidden"
                name="idempotencyKey"
                value={`research-export-xlsx-${randomUUID()}`}
              />
              <input type="hidden" name="format" value="XLSX" />
              <button type="submit" disabled={previewResult?.kind !== "ok"}>
                درخواست XLSX
              </button>
            </form>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Format</th>
                  <th>Status</th>
                  <th>Cohort</th>
                  <th>Policy v</th>
                  <th>Artifact / reason</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {exportsResult?.kind === "ok" && exportsResult.data.items.length > 0 ? (
                  exportsResult.data.items.map((job) => <ExportRow key={job.jobId} job={job} />)
                ) : (
                  <tr>
                    <td colSpan={6}>Export jobی برای این Dataset وجود ندارد.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default async function ResearchStudioPage({ searchParams }: Props) {
  const admin = await requireAdminAccess();
  const query = await searchParams;
  const selectedId = one(query.dataset);
  const message = statusMessage(one(query.status));
  const isFounder = admin.roles.includes("founder");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="analytics"
        title="Founder Research Studio"
        subtitle="De-identified datasets · audited exports"
      >
        {message ? <div className={styles.banner}>{message}</div> : null}
        {!isFounder ? (
          <AdminPageState state="forbidden" title="Founder role required" />
        ) : (
          <ResearchContent selectedId={selectedId} />
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
