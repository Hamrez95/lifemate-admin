import type { Workspace } from "@/src/config/workspaces";

export function hasAnyPermission(
  permissions: readonly string[],
  required: readonly string[],
): boolean {
  if (required.length === 0) return true;
  const current = new Set(permissions);
  return required.some((permission) => current.has(permission));
}

export function canAccessWorkspace(workspace: Workspace, permissions: readonly string[]): boolean {
  return hasAnyPermission(permissions, workspace.requiredPermissions);
}
