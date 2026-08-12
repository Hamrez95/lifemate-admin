import { FounderOverview } from "@/src/components/dashboard/FounderOverview";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

export default async function CommandCenterPage() {
  const admin = await requireAdminAccess();

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug=""
        title="مرکز فرماندهی"
        subtitle="نمای مدیریتی LifeMate؛ اعداد فقط پس از اتصال KPIهای قابل اعتماد نمایش داده می‌شوند"
      >
        <FounderOverview />
      </AdminShell>
    </AdminSessionProvider>
  );
}
