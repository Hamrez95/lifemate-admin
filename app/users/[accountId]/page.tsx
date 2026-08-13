import { notFound } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UserDetailPageProps = {
  params: Promise<{ accountId: string }>;
};

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { accountId } = await params;
  if (!UUID_PATTERN.test(accountId)) notFound();

  const admin = await requireAdminAccess();
  const canReadUsers = admin.permissions.includes("users.read.basic");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="users"
        title="User 360"
        subtitle="جزئیات کاربر در تسک مستقل ADM-USR-002 تکمیل می‌شود."
      >
        {canReadUsers ? (
          <AdminPageState
            state="unavailable"
            title="نمای User 360 هنوز فعال نشده است"
            description="مسیر امن و شناسه کاربر تأیید شده‌اند، اما هیچ داده جزئیاتی تا اجرای ADM-USR-002 درخواست یا نمایش داده نمی‌شود."
          />
        ) : (
          <AdminPageState state="forbidden" />
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
