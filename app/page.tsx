import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { FounderOverview } from "@/src/components/dashboard/FounderOverview";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getFounderOverview } from "@/src/lib/admin-api/founder-overview";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

export default async function CommandCenterPage() {
  const admin = await requireAdminAccess();
  const overview = await getFounderOverview(admin.permissions);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug=""
        title="مرکز فرماندهی"
        subtitle="نمای اجرایی Founder با داده‌های واقعی، مجاز و دارای freshness"
      >
        <FounderOverview data={overview} />
      </AdminShell>
    </AdminSessionProvider>
  );
}
