import "server-only"

import type { DecodedIdToken } from "firebase-admin/auth"
import { FirebaseAdminConfigurationError, getFirebaseAdminAuth } from "./firebase-admin"
import {
  getAdminPermissions,
  getAdminRole,
  hasAdminPermission,
  type AdminRole,
  type AdminPermission,
} from "@/lib/platform/admin-permissions"
export type { AdminPermission } from "@/lib/platform/admin-permissions"

export interface VerifiedAdmin {
  uid: string
  email: string
  displayName: string
  role: AdminRole
  permissions: AdminPermission[]
}

export class AdminAuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message)
    this.name = "AdminAuthorizationError"
  }
}

export async function requireAdmin(
  request: Request,
  permission?: AdminPermission,
): Promise<VerifiedAdmin> {
  const authorization = request.headers.get("authorization")
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    throw new AdminAuthorizationError("Admin authentication is required.", 401)
  }

  let decoded: DecodedIdToken
  try {
    decoded = await getFirebaseAdminAuth().verifyIdToken(match[1], true)
  } catch (error) {
    if (error instanceof FirebaseAdminConfigurationError) throw error
    throw new AdminAuthorizationError("The Firebase ID token is invalid or expired.", 401)
  }

  const role = getAdminRole(decoded.role)
  if (!role) {
    throw new AdminAuthorizationError("This Firebase account is not an administrator.", 403)
  }

  const permissions = getAdminPermissions(role, decoded.platformPermissions)
  if (permission && !hasAdminPermission(role, permissions, permission)) {
    throw new AdminAuthorizationError("This administrator lacks the required permission.", 403)
  }

  return {
    uid: decoded.uid,
    email: typeof decoded.email === "string" ? decoded.email : "",
    displayName:
      typeof decoded.name === "string" && decoded.name.trim()
        ? decoded.name.trim()
        : typeof decoded.email === "string"
          ? decoded.email.split("@")[0]
          : decoded.uid,
    role,
    permissions,
  }
}
