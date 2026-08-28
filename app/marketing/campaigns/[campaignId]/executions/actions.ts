"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  cancelCampaignExecution,
  confirmCampaignExecution,
  prepareCampaignExecution,
  scheduleCampaignExecution,
} from "@/src/lib/admin-api/campaign-executions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDER = /^[a-z0-9][a-z0-9_.-]{1,39}$/;
const CURRENCY = /^[A-Z]{3}$/;

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function destination(campaignId: string, notice: string, message: string): never {
  redirect(
    `/marketing/campaigns/${campaignId}/executions?${new URLSearchParams({ notice, message }).toString()}`,
  );
}

function message(result: { kind: string; message?: string; correlationId?: string }): string {
  if (result.kind === "forbidden")
    return "مجوز marketing.campaign.send برای این عملیات وجود ندارد.";
  if (result.kind === "conflict")
    return result.message ?? "Execution همزمان تغییر کرده است؛ صفحه را تازه کنید.";
  if (result.kind === "invalid") return result.message ?? "درخواست Campaign Execution معتبر نیست.";
  if (result.kind === "not_found") return result.message ?? "Campaign Execution پیدا نشد.";
  if (result.kind === "unauthenticated") return "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.";
  return result.correlationId
    ? `Campaign Orchestrator در دسترس نیست. کد پیگیری: ${result.correlationId}`
    : "Campaign Orchestrator فعلاً در دسترس نیست.";
}

export async function prepareCampaignExecutionAction(formData: FormData): Promise<void> {
  const campaignId = text(formData, "campaignId");
  const audienceSnapshotId = text(formData, "audienceSnapshotId");
  const campaignUpdatedAtUtc = text(formData, "campaignUpdatedAtUtc");
  const sms = formData.get("channelSms") === "on";
  const push = formData.get("channelPush") === "on";
  const smsProvider = text(formData, "smsProvider").toLowerCase();
  const smsCurrency = text(formData, "smsCurrency").toUpperCase();

  if (!UUID.test(campaignId) || !UUID.test(audienceSnapshotId))
    destination(campaignId, "error", "شناسه Campaign یا Audience Snapshot معتبر نیست.");
  if (Number.isNaN(Date.parse(campaignUpdatedAtUtc)))
    destination(campaignId, "error", "نسخه Campaign معتبر نیست؛ صفحه را تازه کنید.");
  const channels = [sms ? "SMS" : null, push ? "Push" : null].filter(Boolean) as Array<
    "SMS" | "Push"
  >;
  if (channels.length === 0) destination(campaignId, "error", "حداقل یک کانال انتخاب کنید.");
  if (sms && (!PROVIDER.test(smsProvider) || !CURRENCY.test(smsCurrency)))
    destination(campaignId, "error", "برای SMS باید provider و currency معتبر انتخاب شوند.");

  const result = await prepareCampaignExecution({
    campaignId,
    audienceSnapshotId,
    campaignUpdatedAtUtc,
    channels,
    smsProvider: sms ? smsProvider : null,
    smsCurrency: sms ? smsCurrency : null,
  });
  if (result.kind !== "ok") destination(campaignId, "error", message(result));
  revalidatePath(`/marketing/campaigns/${campaignId}/executions`);
  destination(
    campaignId,
    "success",
    "Execution آماده شد. شمارش، opt-out و هزینه را بررسی کنید و فقط سپس Confirm/Schedule کنید.",
  );
}

export async function confirmCampaignExecutionAction(formData: FormData): Promise<void> {
  const campaignId = text(formData, "campaignId");
  const executionId = text(formData, "executionId");
  const expectedVersion = Number(text(formData, "expectedVersion"));
  const result = await confirmCampaignExecution(executionId, expectedVersion);
  if (result.kind !== "ok") destination(campaignId, "error", message(result));
  revalidatePath(`/marketing/campaigns/${campaignId}/executions`);
  destination(campaignId, "success", "Second confirmation ثبت شد.");
}

export async function scheduleCampaignExecutionAction(formData: FormData): Promise<void> {
  const campaignId = text(formData, "campaignId");
  const executionId = text(formData, "executionId");
  const expectedVersion = Number(text(formData, "expectedVersion"));
  const raw = text(formData, "scheduledAtUtc");
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) destination(campaignId, "error", "زمان Schedule معتبر نیست.");
  const result = await scheduleCampaignExecution(executionId, expectedVersion, date.toISOString());
  if (result.kind !== "ok") destination(campaignId, "error", message(result));
  revalidatePath(`/marketing/campaigns/${campaignId}/executions`);
  destination(campaignId, "success", "Execution زمان‌بندی شد.");
}

export async function cancelCampaignExecutionAction(formData: FormData): Promise<void> {
  const campaignId = text(formData, "campaignId");
  const executionId = text(formData, "executionId");
  const expectedVersion = Number(text(formData, "expectedVersion"));
  const reason = text(formData, "reason");
  if (reason.length < 10) destination(campaignId, "error", "دلیل لغو باید حداقل ۱۰ نویسه باشد.");
  const result = await cancelCampaignExecution(executionId, expectedVersion, reason);
  if (result.kind !== "ok") destination(campaignId, "error", message(result));
  revalidatePath(`/marketing/campaigns/${campaignId}/executions`);
  destination(campaignId, "success", "Execution لغو شد و audit reason ثبت شد.");
}
