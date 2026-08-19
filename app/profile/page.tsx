import type { Metadata } from "next";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { ChangePasswordForm } from "@/src/components/auth/ChangePasswordForm";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

export const metadata: Metadata = {
  title: "پروفایل و امنیت",
};

export default async function ProfilePage() {
  const admin = await requireAdminAccess();

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="profile"
        title="پروفایل و امنیت"
        subtitle="مدیریت اطلاعات ورود و امنیت حساب Command Center"
      >
        <ChangePasswordForm />
      </AdminShell>
    </AdminSessionProvider>
  );
}
