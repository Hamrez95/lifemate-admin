"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { AdminCapabilitySnapshot } from "@/src/lib/admin-api/types";

const AdminSessionContext = createContext<AdminCapabilitySnapshot | null>(null);

export function AdminSessionProvider({
  admin,
  children,
}: {
  admin: AdminCapabilitySnapshot;
  children: ReactNode;
}) {
  return <AdminSessionContext.Provider value={admin}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminCapabilitySnapshot {
  const session = useContext(AdminSessionContext);
  if (!session) {
    throw new Error("AdminSessionProvider is required inside protected Command Center routes.");
  }
  return session;
}
