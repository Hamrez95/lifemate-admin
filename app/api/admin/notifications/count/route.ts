import { NextResponse } from "next/server";

import { countAdminNotifications } from "@/src/lib/admin-api/notifications";

function noStore(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  for (const key of incoming.searchParams.keys()) {
    if (key !== "sources") {
      return noStore({ state: "invalid", message: "پارامتر شمارش اعلان معتبر نیست." }, 400);
    }
  }

  const result = await countAdminNotifications(incoming.searchParams);
  if (result.kind === "ok") return noStore(result.data, 200);
  if (result.kind === "unauthenticated") return noStore({ state: "unauthenticated" }, 401);
  if (result.kind === "forbidden") return noStore({ state: "forbidden" }, 403);
  if (result.kind === "invalid") return noStore({ state: "invalid", message: result.message }, 400);
  if (result.kind === "conflict") return noStore({ state: "conflict", message: result.message }, 409);
  if (result.kind === "not_found") return noStore({ state: "not_found" }, 404);
  return noStore({ state: "unavailable", correlationId: result.correlationId }, 503);
}
