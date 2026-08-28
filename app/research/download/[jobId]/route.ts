import { NextResponse } from "next/server";

import { getResearchExportDownload } from "@/src/lib/admin-api/research-studio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  if (!UUID.test(jobId)) {
    return NextResponse.json({ state: "invalid" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const result = await getResearchExportDownload(jobId.toLowerCase());
  if (result.kind === "unauthenticated") {
    return NextResponse.redirect(new URL("/login", _request.url), { status: 303 });
  }
  if (result.kind === "forbidden") {
    return NextResponse.json({ state: "forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (result.kind !== "ok") {
    return NextResponse.json({ state: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  let target: URL;
  try {
    target = new URL(result.data.signedUrl);
  } catch {
    return NextResponse.json({ state: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (target.protocol !== "https:") {
    return NextResponse.json({ state: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const response = NextResponse.redirect(target, { status: 303 });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
