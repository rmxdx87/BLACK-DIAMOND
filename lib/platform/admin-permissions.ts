export type AdminRole = "super_admin" | "admin" | "viewer"

export type AdminPermission =
  | "view_games"
  | "create_games"
  | "edit_games"
  | "delete_games"
  | "manage_sessions"
  | "manage_api_configs"
  | "publish_predictions"
  | "switch_prediction_mode"
  | "view_audit_logs"
  | "manage_user_game_availability"
  | "manage_admin_accounts"

export const ADMIN_PERMISSIONS: AdminPermission[] = [
  "view_games",
  "create_games",
  "edit_games",
  "delete_games",
  "manage_sessions",
  "manage_api_configs",
  "publish_predictions",
  "switch_prediction_mode",
  "view_audit_logs",
  "manage_user_game_availability",
  "manage_admin_accounts",
]

export const ADMIN_ROLE_PERMISSIONS: AdminPermission[] = [
  "view_games",
  "create_games",
  "edit_games",
  "manage_sessions",
  "manage_api_configs",
  "publish_predictions",
  "switch_prediction_mode",
]

export const VIEWER_PERMISSIONS: AdminPermission[] = [
  "view_games",
  "view_audit_logs",
]

export function getAdminRole(value: unknown): AdminRole | null {
  return value === "admin" || value === "super_admin" || value === "viewer"
    ? value
    : null
}

export function getAdminPermissions(role: AdminRole, value: unknown): AdminPermission[] {
  if (role === "super_admin") return [...ADMIN_PERMISSIONS]
  if (!Array.isArray(value)) return []
  const allowedPermissions =
    role === "viewer" ? VIEWER_PERMISSIONS : ADMIN_ROLE_PERMISSIONS
  return value.filter(
    (permission): permission is AdminPermission =>
      typeof permission === "string" &&
      allowedPermissions.includes(permission as AdminPermission),
  )
}

export function getDefaultAdminPermissions(role: AdminRole): AdminPermission[] {
  if (role === "super_admin") return [...ADMIN_PERMISSIONS]
  if (role === "admin") return [...ADMIN_ROLE_PERMISSIONS]
  return [...VIEWER_PERMISSIONS]
}

export function hasAdminPermission(
  role: AdminRole,
  permissions: AdminPermission[],
  required: AdminPermission,
): boolean {
  return role === "super_admin" || permissions.includes(required)
}
