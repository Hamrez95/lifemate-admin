import { NextResponse } from "next/server";

import { searchCommandCenter } from "@/src/lib/admin-api/global-search";

const ALLOWED_PARAMS = new Set(["q", "types", "page", "pageSize"]);

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const params = new URLSearchParams();
  for (const [key, value] of incoming.searchParams.entries()) {
    if (ALLOWED_PARAMS.has(key)) params.append(key, value);
  }

  const result = await searchCommandCenter(params);
  if (result.kind === "ok") {
    return NextResponse.json(result.data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (result.kind === "rate_limited") {
    return NextResponse.json(
      { state: "rate_limited", retryAfterSeconds: result.retryAfterSeconds },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(result.retryAfterSeconds),
        },
      },
    );
  }
  if (result.kind === "unauthenticated") {
    return NextResponse.json({ state: "unauthenticated" }, { status: 401 });
  }
  if (result.kind === "forbidden") {
    return NextResponse.json({ state: "forbidden" }, { status: 403 });
  }
  if (result.kind === "invalid") {
    return NextResponse.json(
      { state: "invalid", message: result.message ?? "جست‌وجو معتبر نیست." },
      { status: 400 },
    );
  }
  return NextResponse.json(
    { state: "unavailable", correlationId: result.correlationId },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
