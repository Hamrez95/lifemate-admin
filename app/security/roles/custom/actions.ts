"use server";

import { revalidatePath } from "next/cache";

import {
  createCustomRole,
  mutateCustomRolePermission,
  retireCustomRole,
  type CustomRoleMutationResult,
  updateCustomRole,
} from "@/src/lib/admin-api/custom-roles";

export type CustomRoleActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialCustomRoleActionState: CustomRoleActionState = { status: "idle" };

const ROLE_CODE = /^[a-z][a-z0-9_]{1,63}$/;
const PERMISSION_CODE = /^[a-z][a-z0-9_.]{1,119}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,180}$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function mutationState(
  result: CustomRoleMutationResult,
  successMessage: string,
): CustomRoleActionState {
  if (result.kind === "ok") {
    return {
      status: "success",
      message: result.replayed ? `${successMessage} (replay امن)` : successMessage,
    };
  }
  if (result.kind === "unauthenticated" || result.kind === "forbidden") {
    return {
      status: "forbidden",
      message:
        result.kind === "forbidden"
          ? "مجوز مدیریت نقش‌های سفارشی وجود ندارد."
          : "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.",
    };
  }
  if (result.kind === "invalid") {
    return { status: "invalid", message: result.message ?? "درخواست نقش معتبر نیست." };
  }
  if (result.kind === "conflict") {
    return {
      status: "conflict",
      message: result.message ?? "نسخه نقش تغییر کرده است؛ صفحه را دوباره بارگذاری کنید.",
    };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس نقش‌ها در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس نقش‌ها فعلاً در دسترس نیست.",
  };
}

function common(
  formData: FormData,
): { reason: string; idempotencyKey: string } | { error: CustomRoleActionState } {
  const reason = text(formData, "reason");
  const idempotencyKey = text(formData, "idempotencyKey");
  if (reason.length < 10 || reason.length > 1000) {
    return { error: { status: "invalid", message: "دلیل باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." } };
  }
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return { error: { status: "invalid", message: "شناسه امن درخواست معتبر نیست." } };
  }
  return { reason, idempotencyKey };
}

function version(formData: FormData): number | null {
  const raw = text(formData, "expectedVersion");
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

function refresh() {
  revalidatePath("/security");
  revalidatePath("/security/roles/custom");
}

export async function createCustomRoleAction(
  _previous: CustomRoleActionState,
  formData: FormData,
): Promise<CustomRoleActionState> {
  const code = text(formData, "code").toLowerCase();
  const displayName = text(formData, "displayName");
  const rankRaw = text(formData, "rank");
  const confirmation = text(formData, "confirmation");
  const shared = common(formData);
  if ("error" in shared) return shared.error;
  if (!ROLE_CODE.test(code) || code === "founder" || code === "super_admin") {
    return { status: "invalid", message: "کد نقش معتبر نیست یا رزرو شده است." };
  }
  if (displayName.length < 2 || displayName.length > 120) {
    return { status: "invalid", message: "نام نقش باید بین ۲ تا ۱۲۰ نویسه باشد." };
  }
  if (!/^\d+$/.test(rankRaw)) return { status: "invalid", message: "Rank معتبر نیست." };
  const rank = Number(rankRaw);
  if (!Number.isInteger(rank) || rank < 1 || rank > 1000) {
    return { status: "invalid", message: "Rank باید بین ۱ تا ۱۰۰۰ باشد." };
  }
  if (confirmation !== "confirm-custom-role-create") {
    return { status: "invalid", message: "تأیید صریح ساخت نقش لازم است." };
  }
  const state = mutationState(
    await createCustomRole({ code, displayName, rank, ...shared }),
    "نقش سفارشی با Audit ساخته شد.",
  );
  if (state.status === "success") refresh();
  return state;
}

export async function updateCustomRoleAction(
  _previous: CustomRoleActionState,
  formData: FormData,
): Promise<CustomRoleActionState> {
  const code = text(formData, "code").toLowerCase();
  const displayName = text(formData, "displayName");
  const rankRaw = text(formData, "rank");
  const expectedVersion = version(formData);
  const confirmation = text(formData, "confirmation");
  const shared = common(formData);
  if ("error" in shared) return shared.error;
  if (!ROLE_CODE.test(code) || displayName.length < 2 || displayName.length > 120) {
    return { status: "invalid", message: "مشخصات نقش معتبر نیست." };
  }
  if (!/^\d+$/.test(rankRaw) || expectedVersion === null) {
    return { status: "invalid", message: "Rank یا نسخه نقش معتبر نیست." };
  }
  const rank = Number(rankRaw);
  if (!Number.isInteger(rank) || rank < 1 || rank > 1000) {
    return { status: "invalid", message: "Rank باید بین ۱ تا ۱۰۰۰ باشد." };
  }
  if (confirmation !== "confirm-custom-role-update") {
    return { status: "invalid", message: "تأیید صریح ویرایش نقش لازم است." };
  }
  const state = mutationState(
    await updateCustomRole({ code, displayName, rank, expectedVersion, ...shared }),
    "نقش با optimistic concurrency و Audit به‌روزرسانی شد.",
  );
  if (state.status === "success") refresh();
  return state;
}

export async function retireCustomRoleAction(
  _previous: CustomRoleActionState,
  formData: FormData,
): Promise<CustomRoleActionState> {
  const code = text(formData, "code").toLowerCase();
  const expectedVersion = version(formData);
  const confirmation = text(formData, "confirmation");
  const shared = common(formData);
  if ("error" in shared) return shared.error;
  if (!ROLE_CODE.test(code) || expectedVersion === null) {
    return { status: "invalid", message: "کد یا نسخه نقش معتبر نیست." };
  }
  if (confirmation !== "confirm-custom-role-retire") {
    return { status: "invalid", message: "تأیید صریح بازنشسته‌کردن نقش لازم است." };
  }
  const state = mutationState(
    await retireCustomRole({ code, expectedVersion, ...shared }),
    "نقش سفارشی بازنشسته شد.",
  );
  if (state.status === "success") refresh();
  return state;
}

export async function mutateCustomRolePermissionAction(
  _previous: CustomRoleActionState,
  formData: FormData,
): Promise<CustomRoleActionState> {
  const roleCode = text(formData, "roleCode").toLowerCase();
  const permissionCode = text(formData, "permissionCode").toLowerCase();
  const action = text(formData, "permissionAction");
  const expectedVersion = version(formData);
  const confirmation = text(formData, "confirmation");
  const shared = common(formData);
  if ("error" in shared) return shared.error;
  if (
    !ROLE_CODE.test(roleCode) ||
    !PERMISSION_CODE.test(permissionCode) ||
    expectedVersion === null
  ) {
    return { status: "invalid", message: "نقش، permission یا نسخه معتبر نیست." };
  }
  if (action !== "assign" && action !== "revoke") {
    return { status: "invalid", message: "نوع تغییر permission معتبر نیست." };
  }
  if (confirmation !== `confirm-custom-role-permission-${action}`) {
    return { status: "invalid", message: "تأیید صریح تغییر permission لازم است." };
  }
  const state = mutationState(
    await mutateCustomRolePermission(action, {
      roleCode,
      permissionCode,
      expectedVersion,
      ...shared,
    }),
    action === "assign" ? "Permission به نقش افزوده شد." : "Permission از نقش حذف شد.",
  );
  if (state.status === "success") refresh();
  return state;
}
