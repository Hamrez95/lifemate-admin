import { notFound, redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { findWorkspace } from "@/src/config/workspaces";
import { canAccessWorkspace } from "@/src/lib/admin-api/policy";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

type WorkspacePageProps = {
  params: Promise<{ workspace: string }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspace: slug } = await params;
  const workspace = findWorkspace(slug);
  if (!workspace || !workspace.slug) notFound();

  const admin = await requireAdminAccess();
  if (!canAccessWorkspace(workspace, admin.permissions)) redirect("/forbidden");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug={workspace.slug}
        title={workspace.label}
        subtitle={workspace.description}
      >
        <section className="workspace-placeholder" aria-labelledby="workspace-placeholder-title">
          <span className="workspace-placeholder__symbol" aria-hidden="true">
            {workspace.symbol}
          </span>
          <p className="eyebrow">Vertical slice pending</p>
          <h2 id="workspace-placeholder-title">دسترسی این فضا از سمت سرور تأیید شد.</h2>
          <p>
            مسیر آماده‌ی توسعه‌ی workflow واقعی است. داده و mutation هر workspace فقط از Admin API و
            همراه با permission، validation، audit و تست denial اضافه می‌شود.
          </p>
          <div className="workspace-placeholder__guardrail">
            <strong>Server authorized</strong>
            <span>نمایش منو صرفاً UX است؛ ورود به این route نیز permission را بررسی می‌کند.</span>
          </div>
        </section>
      </AdminShell>
    </AdminSessionProvider>
  );
}
