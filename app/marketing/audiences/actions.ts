"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAudienceSegment,
  previewAudienceSegment,
  snapshotAudienceSegment,
  type SegmentAttribute,
  type SegmentOperator,
} from "@/src/lib/admin-api/audience-segments";

const IDEMPOTENCY = /^[A-Za-z0-9._:-]{8,180}$/;
const KEY = /^[a-z][a-z0-9._-]{2,95}$/;
const attributes: SegmentAttribute[] = [
  "demographic.locale",
  "product.code",
  "product.enrolled",
  "subscription.status",
  "entitlement.code",
  "engagement.lifecycle",
  "engagement.last_active_days",
];
const operators: SegmentOperator[] = ["eq", "neq", "in", "not_in", "gte", "lte", "exists"];

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function destination(kind: string, message: string): never {
  redirect(`/marketing/audiences?${new URLSearchParams({ notice: kind, message }).toString()}`);
}

function resultMessage(result: { kind: string; message?: string; correlationId?: string }): string {
  if (result.kind === "forbidden")
    return "مجوز مدیریت Audience Segment برای این عملیات وجود ندارد.";
  if (result.kind === "conflict")
    return result.message ?? "Segment همزمان تغییر کرده است؛ صفحه را تازه کنید.";
  if (result.kind === "invalid") return result.message ?? "تعریف Segment معتبر نیست.";
  if (result.kind === "unauthenticated") return "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.";
  if (result.kind === "not_found") return result.message ?? "Segment پیدا نشد.";
  return result.correlationId
    ? `سرویس Audience در دسترس نیست. کد پیگیری: ${result.correlationId}`
    : "سرویس Audience فعلاً در دسترس نیست.";
}

function scalar(attribute: SegmentAttribute, operator: SegmentOperator, raw: string) {
  if (operator === "exists") return undefined;
  if (operator === "gte" || operator === "lte" || attribute === "engagement.last_active_days") {
    const value = Number(raw);
    if (!Number.isFinite(value))
      destination("error", "برای شرط عددی باید مقدار عددی معتبر وارد شود.");
    return value;
  }
  if (attribute === "product.enrolled") {
    if (raw !== "true" && raw !== "false")
      destination("error", "مقدار product.enrolled باید true یا false باشد.");
    return raw === "true";
  }
  if (operator === "in" || operator === "not_in") {
    const values = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (values.length < 1 || values.length > 50)
      destination("error", "فهرست شرط باید بین ۱ تا ۵۰ مقدار داشته باشد.");
    return values;
  }
  if (!raw) destination("error", "مقدار شرط الزامی است.");
  return raw;
}

export async function createAudienceSegmentAction(formData: FormData): Promise<void> {
  const idempotencyKey = text(formData, "idempotencyKey");
  const key = text(formData, "key").toLowerCase();
  const name = text(formData, "name");
  const description = text(formData, "description");
  const match = text(formData, "match") === "any" ? "any" : "all";
  const attribute = text(formData, "attribute") as SegmentAttribute;
  const operator = text(formData, "operator") as SegmentOperator;
  const rawValue = text(formData, "value");

  if (!IDEMPOTENCY.test(idempotencyKey)) destination("error", "شناسه امن درخواست معتبر نیست.");
  if (!KEY.test(key)) destination("error", "کلید Segment معتبر نیست.");
  if (name.length < 2 || name.length > 120)
    destination("error", "نام Segment باید بین ۲ تا ۱۲۰ نویسه باشد.");
  if (description.length > 500) destination("error", "توضیح Segment بیش از حد طولانی است.");
  if (!attributes.includes(attribute))
    destination("error", "Attribute انتخاب‌شده برای Marketing مجاز نیست.");
  if (!operators.includes(operator)) destination("error", "Operator معتبر نیست.");

  const value = scalar(attribute, operator, rawValue);
  const result = await createAudienceSegment(
    {
      key,
      name,
      description: description || null,
      rules: {
        version: 1,
        match,
        rules: [{ attribute, operator, ...(value === undefined ? {} : { value }) }],
      },
    },
    idempotencyKey,
  );
  if (result.kind !== "ok") destination("error", resultMessage(result));
  revalidatePath("/marketing/audiences");
  destination(
    "success",
    "Audience Segment ساخته شد؛ قبل از Campaign حتماً Preview/Snapshot را بررسی کنید.",
  );
}

export async function previewAudienceSegmentAction(formData: FormData): Promise<void> {
  const id = text(formData, "segmentId");
  const result = await previewAudienceSegment(id);
  if (result.kind !== "ok") destination("error", resultMessage(result));
  const value = result.data.suppressed
    ? `کمتر از حداقل cohort (${result.data.minimumCohortSize})؛ شمارش دقیق برای حریم خصوصی مخفی شد.`
    : `Preview canonical: ${result.data.count ?? 0} عضو.`;
  destination("success", value);
}

export async function snapshotAudienceSegmentAction(formData: FormData): Promise<void> {
  const id = text(formData, "segmentId");
  const version = Number(text(formData, "version"));
  const idempotencyKey = text(formData, "idempotencyKey");
  if (!Number.isInteger(version) || version < 1) destination("error", "نسخه Segment معتبر نیست.");
  if (!IDEMPOTENCY.test(idempotencyKey)) destination("error", "شناسه امن درخواست معتبر نیست.");
  const result = await snapshotAudienceSegment(id, version, idempotencyKey);
  if (result.kind !== "ok") destination("error", resultMessage(result));
  const count = result.data.suppressed ? "suppressed" : String(result.data.memberCount ?? 0);
  destination(
    "success",
    `Snapshot immutable ساخته شد: ${result.data.id.slice(0, 8)}… · members=${count}`,
  );
}
