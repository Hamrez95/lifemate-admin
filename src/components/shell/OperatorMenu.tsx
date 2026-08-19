"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAdminSession } from "@/src/components/auth/AdminSessionProvider";
import { createBrowserSupabaseClient } from "@/src/lib/supabase/client";

const roleLabels: Record<string, string> = {
  founder: "Founder",
  super_admin: "Super Admin",
  product: "Product",
  support: "Support",
  marketing: "Marketing",
  finance: "Finance",
  technical: "Technical",
  security: "Security",
};

export function OperatorMenu() {
  const router = useRouter();
  const admin = useAdminSession();
  const [pending, setPending] = useState(false);
  const role = admin.roles[0] ? (roleLabels[admin.roles[0]] ?? admin.roles[0]) : "Admin";

  async function signOut() {
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      // Local scope avoids terminating the same LifeMate account's mobile sessions.
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="operator-chip">
      <span className="operator-chip__avatar" aria-hidden="true">
        LM
      </span>
      <span className="operator-chip__copy">
        <strong>{role}</strong>
        <small>حساب مدیریتی LifeMate</small>
      </span>
      <Link
        className="operator-chip__profile"
        href="/profile"
        aria-label="پروفایل و تغییر رمز عبور"
      >
        پروفایل
      </Link>
      <button
        type="button"
        className="operator-chip__logout"
        onClick={signOut}
        disabled={pending}
        aria-label="خروج از نشست Command Center"
      >
        {pending ? "…" : "خروج"}
      </button>
    </div>
  );
}
