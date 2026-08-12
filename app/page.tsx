import { FounderOverview } from "@/src/components/dashboard/FounderOverview";
import { AdminShell } from "@/src/components/shell/AdminShell";

export default function CommandCenterPage() {
  return (
    <AdminShell
      activeSlug=""
      title="مرکز فرماندهی"
      subtitle="نمای مدیریتی LifeMate؛ فعلاً در حالت Foundation و بدون اتصال به داده تولیدی"
    >
      <FounderOverview />
    </AdminShell>
  );
}
