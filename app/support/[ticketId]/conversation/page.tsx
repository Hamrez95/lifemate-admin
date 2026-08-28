import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getSupportConversation,
  getSupportConversationOperations,
} from "@/src/lib/admin-api/support-conversation";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { SupportConversationPanel } from "../SupportConversationPanel";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ ticketId: string }> };

function stateFor(kind: "forbidden" | "not_found" | "invalid" | "unavailable") {
  if (kind === "not_found") notFound();
  if (kind === "forbidden") {
    return <AdminPageState state="forbidden" title="گفتگو برای نقش فعلی قابل مشاهده نیست" />;
  }
  if (kind === "invalid") {
    return <AdminPageState state="error" title="شناسه گفتگو معتبر نیست" />;
  }
  return <AdminPageState state="unavailable" title="گفتگوی پشتیبانی فعلاً در دسترس نیست" />;
}

export default async function SupportConversationPage({ params }: Props) {
  const { ticketId } = await params;
  if (!UUID_PATTERN.test(ticketId)) notFound();

  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("support.read");
  const canWrite = admin.permissions.includes("support.write");
  const normalizedTicketId = ticketId.toLowerCase();

  if (!canRead) {
    return (
      <AdminSessionProvider admin={admin}>
        <AdminShell
          activeSlug="support"
          title="گفتگوی پشتیبانی"
          subtitle="گفتگوی permission-aware و server-only"
        >
          <AdminPageState state="forbidden" />
        </AdminShell>
      </AdminSessionProvider>
    );
  }

  const [conversation, operations] = await Promise.all([
    getSupportConversation(normalizedTicketId),
    getSupportConversationOperations(normalizedTicketId),
  ]);
  if (conversation.kind === "unauthenticated" || operations.kind === "unauthenticated") {
    redirect("/login");
  }

  let content: ReactNode;
  if (conversation.kind !== "ok") {
    content = stateFor(conversation.kind);
  } else if (operations.kind !== "ok") {
    content = stateFor(operations.kind);
  } else {
    content = (
      <>
        <p>
          <Link href={`/support/${normalizedTicketId}`}>بازگشت به جزئیات و Timeline تیکت</Link>
        </p>
        <SupportConversationPanel
          ticketId={normalizedTicketId}
          canWrite={canWrite}
          messages={conversation.data.items}
          escalations={operations.data.escalations}
          links={operations.data.links}
          requestSeed={crypto.randomUUID()}
        />
      </>
    );
  }

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="support"
        title="گفتگوی پشتیبانی"
        subtitle="پیام واقعی کاربر/پشتیبانی، ارجاع و مراجع داخلی بدون DB مستقیم"
      >
        {content}
      </AdminShell>
    </AdminSessionProvider>
  );
}
