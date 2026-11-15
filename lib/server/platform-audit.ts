import "server-only"

import { PlatformAuditEventSchema, type PlatformAuditEvent } from "@/lib/platform/audit-schema"
import type { AdminPermission, VerifiedAdmin } from "./admin-auth"
import { getFirebaseAdminDatabase } from "./firebase-admin"

const AUDIT_PATH = "platformCatalog/auditLogs"

export class PlatformAuditError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PlatformAuditError"
  }
}

export async function beginPlatformAuditEvent(
  admin: VerifiedAdmin,
  permission: AdminPermission,
  method: "POST" | "PATCH" | "DELETE",
  path: string,
): Promise<string> {
  const reference = getFirebaseAdminDatabase().ref(AUDIT_PATH).push()
  const eventId = reference.key
  if (!eventId) throw new PlatformAuditError("Unable to allocate an audit event ID.")

  const parsed = PlatformAuditEventSchema.safeParse({
    eventId,
    actorUid: admin.uid,
    actorDisplayName: admin.displayName,
    actorRole: admin.role,
    permission,
    method,
    path,
    requestedAt: Date.now(),
    completedAt: null,
    outcome: "REQUESTED",
    responseStatus: null,
  })
  if (!parsed.success) throw new Error("The generated platform audit event failed validation.")

  try {
    await reference.set(parsed.data)
  } catch {
    throw new PlatformAuditError("The audit service is unavailable; the requested action was not executed.")
  }
  return eventId
}

export async function finishPlatformAuditEvent(
  eventId: string,
  outcome: "COMPLETED" | "REJECTED" | "FAILED",
  responseStatus: number | null,
): Promise<void> {
  try {
    await getFirebaseAdminDatabase().ref(`${AUDIT_PATH}/${eventId}`).update({
      outcome,
      responseStatus,
      completedAt: Date.now(),
    })
  } catch {
    throw new PlatformAuditError("The action ran, but its audit event could not be finalized.")
  }
}

export async function listPlatformAuditEvents(limit: number): Promise<PlatformAuditEvent[]> {
  const snapshot = await getFirebaseAdminDatabase()
    .ref(AUDIT_PATH)
    .orderByChild("requestedAt")
    .limitToLast(limit)
    .get()
  const value = snapshot.val()
  if (value === null) return []
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Stored platform audit events have an invalid shape.")
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([eventId, candidate]) => {
      const parsed = PlatformAuditEventSchema.safeParse(candidate)
      if (!parsed.success || parsed.data.eventId !== eventId) {
        throw new Error(`Stored platform audit event ${eventId} failed schema validation.`)
      }
      return parsed.data
    })
    .sort((left, right) => right.requestedAt - left.requestedAt)
}
