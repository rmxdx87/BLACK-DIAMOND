import { z } from "zod"
import { ADMIN_PERMISSIONS } from "./admin-permissions.ts"

export const PlatformAuditEventSchema = z.object({
  eventId: z.string().min(1).max(128),
  actorUid: z.string().min(1).max(128),
  actorDisplayName: z.string().min(1).max(120),
  actorRole: z.enum(["admin", "super_admin"]),
  permission: z.enum(ADMIN_PERMISSIONS as [typeof ADMIN_PERMISSIONS[number], ...typeof ADMIN_PERMISSIONS[number][]]),
  method: z.enum(["POST", "PATCH", "DELETE"]),
  path: z.string().max(240).refine(
    (path) => path.startsWith("/api/admin/platform/") || path === "/api/admin/accounts",
  ),
  requestedAt: z.number().int().positive(),
  completedAt: z.number().int().positive().nullable(),
  outcome: z.enum(["REQUESTED", "COMPLETED", "REJECTED", "FAILED"]),
  responseStatus: z.number().int().min(100).max(599).nullable(),
}).strict()

export type PlatformAuditEvent = z.infer<typeof PlatformAuditEventSchema>
