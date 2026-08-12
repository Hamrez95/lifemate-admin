export type AdminCapabilitySnapshot = {
  accountId: string;
  roles: string[];
  permissions: string[];
};

export type AdminApiProblem = {
  status: number;
  code: string;
  title: string;
  correlationId?: string;
};

export type AdminAccessResult =
  | { kind: "ok"; admin: AdminCapabilitySnapshot }
  | { kind: "unauthenticated" }
  | { kind: "mfa_required" }
  | { kind: "forbidden"; code: string }
  | { kind: "unavailable"; correlationId?: string };
