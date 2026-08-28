"use server";

import { revalidatePath } from "next/cache";

import {
  createPlatformControl,
  createPlatformRule,
  killSwitchPlatformControl,
  rollbackPlatformControl,
  updatePlatformControl,
  updatePlatformRule,
  type PlatformControl,
  type PlatformRule,
} from "@/src/lib/admin-api/platform-controls";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function integer(formData: FormData, key: string) {
  const value = Number(text(formData, key));
  return Number.isSafeInteger(value) ? value : null;
}

function nullable(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? value : null;
}

function valueFor(valueType: PlatformControl["valueType"], raw: string): unknown {
  if (valueType === "Boolean") return raw === "true";
  if (valueType === "Integer") {
    const value = Number(raw);
    return Number.isSafeInteger(value) ? value : raw;
  }
  if (valueType === "Json") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  return raw;
}

function key(operation: string, parts: Array<string | number | null>) {
  return `${operation}:${parts.join(":")}`.replace(/[^A-Za-z0-9._:-]/g, "_").slice(0, 180);
}

export async function createControlAction(formData: FormData) {
  const controlKey = text(formData, "controlKey");
  const controlKind = text(formData, "controlKind");
  const valueType = text(formData, "valueType") as PlatformControl["valueType"];
  if (controlKind !== "FeatureFlag" && controlKind !== "Config") return;
  if (!["Boolean", "Integer", "String", "Json"].includes(valueType)) return;
  const reason = text(formData, "reason");
  const result = await createPlatformControl({
    controlKey,
    controlKind,
    valueType,
    defaultValue: valueFor(valueType, text(formData, "defaultValue")),
    description: text(formData, "description"),
    failClosed: formData.get("failClosed") === "on",
    reason,
    idempotencyKey: key("platform-control-create", [controlKey, reason]),
  });
  if (result.kind === "ok") revalidatePath("/operations/platform-controls");
}

export async function updateControlAction(formData: FormData) {
  const controlKey = text(formData, "controlKey");
  const expectedVersion = integer(formData, "expectedVersion");
  const valueType = text(formData, "valueType") as PlatformControl["valueType"];
  const status = text(formData, "status");
  if (expectedVersion === null || !["Boolean", "Integer", "String", "Json"].includes(valueType))
    return;
  if (status !== "Active" && status !== "Retired") return;
  const reason = text(formData, "reason");
  const result = await updatePlatformControl({
    key: controlKey,
    expectedVersion,
    defaultValue: valueFor(valueType, text(formData, "defaultValue")),
    description: text(formData, "description"),
    failClosed: formData.get("failClosed") === "on",
    status,
    reason,
    idempotencyKey: key("platform-control-update", [controlKey, expectedVersion, reason]),
  });
  if (result.kind === "ok") revalidatePath("/operations/platform-controls");
}

export async function createRuleAction(formData: FormData) {
  const controlKey = text(formData, "controlKey");
  const targetType = text(formData, "targetType") as PlatformRule["targetType"];
  const status = text(formData, "status");
  const priority = integer(formData, "priority");
  const valueType = text(formData, "valueType") as PlatformControl["valueType"];
  if (
    !(["Global", "Product", "Segment", "Percentage", "Beta", "Account"] as string[]).includes(
      targetType,
    )
  )
    return;
  if (!(["Active", "Disabled", "Retired"] as string[]).includes(status) || priority === null)
    return;
  const reason = text(formData, "reason");
  const rollout = integer(formData, "rolloutBasisPoints");
  const result = await createPlatformRule({
    controlKey,
    priority,
    targetType,
    targetKey: targetType === "Global" ? null : nullable(formData, "targetKey"),
    rolloutBasisPoints: targetType === "Percentage" ? rollout : null,
    value: valueFor(valueType, text(formData, "value")),
    startsAtUtc: nullable(formData, "startsAtUtc"),
    endsAtUtc: nullable(formData, "endsAtUtc"),
    status: status as "Active" | "Disabled" | "Retired",
    reason,
    idempotencyKey: key("platform-rule-create", [controlKey, priority, targetType, reason]),
  });
  if (result.kind === "ok") revalidatePath("/operations/platform-controls");
}

export async function updateRuleAction(formData: FormData) {
  const ruleId = text(formData, "ruleId");
  const expectedVersion = integer(formData, "expectedVersion");
  const priority = integer(formData, "priority");
  const targetType = text(formData, "targetType") as PlatformRule["targetType"];
  const status = text(formData, "status");
  const valueType = text(formData, "valueType") as PlatformControl["valueType"];
  if (expectedVersion === null || priority === null) return;
  if (
    !(["Global", "Product", "Segment", "Percentage", "Beta", "Account"] as string[]).includes(
      targetType,
    )
  )
    return;
  if (!(["Active", "Disabled", "Retired"] as string[]).includes(status)) return;
  const reason = text(formData, "reason");
  const rollout = integer(formData, "rolloutBasisPoints");
  const result = await updatePlatformRule({
    ruleId,
    expectedVersion,
    priority,
    targetType,
    targetKey: targetType === "Global" ? null : nullable(formData, "targetKey"),
    rolloutBasisPoints: targetType === "Percentage" ? rollout : null,
    value: valueFor(valueType, text(formData, "value")),
    startsAtUtc: nullable(formData, "startsAtUtc"),
    endsAtUtc: nullable(formData, "endsAtUtc"),
    status: status as "Active" | "Disabled" | "Retired",
    reason,
    idempotencyKey: key("platform-rule-update", [ruleId, expectedVersion, reason]),
  });
  if (result.kind === "ok") revalidatePath("/operations/platform-controls");
}

export async function rollbackControlAction(formData: FormData) {
  const controlKey = text(formData, "controlKey");
  const expectedVersion = integer(formData, "expectedVersion");
  const historyVersion = integer(formData, "historyVersion");
  const reason = text(formData, "reason");
  if (expectedVersion === null || historyVersion === null) return;
  const result = await rollbackPlatformControl({
    key: controlKey,
    expectedVersion,
    historyVersion,
    reason,
    idempotencyKey: key("platform-control-rollback", [
      controlKey,
      expectedVersion,
      historyVersion,
      reason,
    ]),
  });
  if (result.kind === "ok") revalidatePath("/operations/platform-controls");
}

export async function killSwitchControlAction(formData: FormData) {
  const controlKey = text(formData, "controlKey");
  const expectedVersion = integer(formData, "expectedVersion");
  const reason = text(formData, "reason");
  if (expectedVersion === null) return;
  const result = await killSwitchPlatformControl({
    key: controlKey,
    expectedVersion,
    reason,
    idempotencyKey: key("platform-control-kill", [controlKey, expectedVersion, reason]),
  });
  if (result.kind === "ok") revalidatePath("/operations/platform-controls");
}
