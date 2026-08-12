import { notFound } from "next/navigation";

import { AdminShell } from "@/src/components/shell/AdminShell";
import { findWorkspace } from "@/src/config/workspaces";

type WorkspacePageProps = {
  params: Promise<{ workspace: string }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspace: slug } = await params;
  const workspace = findWorkspace(slug);

  if (!workspace || !workspace.slug) {
    notFound();
  }

  return (
    <AdminShell activeSlug={workspace.slug} title={workspace.label} subtitle={workspace.description}>
      <section className="workspace-placeholder" aria-labelledby="workspace-placeholder-title">
        <span className="workspace-placeholder__symbol" aria-hidden="true">
          {workspace.symbol}
        </span>
        <p className="eyebrow">Vertical slice pending</p>
        <h2 id="workspace-placeholder-title">ساختار این فضای کاری آماده‌ی توسعه است.</h2>
        <p>
          این مسیر عمداً هنوز به داده تولیدی متصل نیست. هر workspace در PR مستقل و همراه با
          authorization، تست و حالت‌های دسترسی پیاده می‌شود.
        </p>
        <div className="workspace-placeholder__guardrail">
          <strong>Guardrail</strong>
          <span>هیچ دسترسی حساس فقط با نمایش یا عدم نمایش منو کنترل نخواهد شد.</span>
        </div>
      </section>
    </AdminShell>
  );
}
