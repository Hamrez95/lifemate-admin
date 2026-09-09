export type EntitlementAdjustmentSuccess = Record<string, unknown> & {
  httpStatus: number;
  code: string;
};

export type EntitlementConflictKind =
  | "idempotency"
  | "entitlement_version"
  | "approval_required"
  | "approval_policy"
  | "state_changed"
  | "other";

export type EntitlementForbiddenReason =
  "aal2_required" | "abuse_denied" | "permission_denied" | "other";

export function parseEntitlementAdjustmentSuccess(
  value: unknown,
): EntitlementAdjustmentSuccess | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (!Number.isInteger(body.httpStatus)) return null;
  const httpStatus = Number(body.httpStatus);
  if (httpStatus < 200 || httpStatus >= 300 || typeof body.code !== "string") return null;
  return body as EntitlementAdjustmentSuccess;
}

export function classifyEntitlementConflict(code?: string): EntitlementConflictKind {
  switch (code) {
    case "idempotency_conflict":
      return "idempotency";
    case "entitlement_version_conflict":
      return "entitlement_version";
    case "entitlement_adjust_approval_required":
      return "approval_required";
    case "entitlement_adjust_approval_policy_mismatch":
      return "approval_policy";
    case "entitlement_adjustment_conflict":
      return "state_changed";
    default:
      return "other";
  }
}

export function classifyEntitlementForbidden(code?: string): EntitlementForbiddenReason {
  switch (code) {
    case "assurance_level_2_required":
      return "aal2_required";
    case "entitlement_adjust_abuse_denied":
      return "abuse_denied";
    case "entitlement_adjust_permission_denied":
      return "permission_denied";
    default:
      return "other";
  }
}
