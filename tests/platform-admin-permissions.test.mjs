import assert from "node:assert/strict"
import test from "node:test"
import {
  getDefaultAdminPermissions,
  getAdminPermissions,
  getAdminRole,
  hasAdminPermission,
} from "../lib/platform/admin-permissions.ts"
import { CreateAdminAccountSchema } from "../lib/platform/admin-account-schema.ts"
import { PlatformAuditEventSchema } from "../lib/platform/audit-schema.ts"

test("only signed administrator roles are recognized", () => {
  assert.equal(getAdminRole("admin"), "admin")
  assert.equal(getAdminRole("super_admin"), "super_admin")
  assert.equal(getAdminRole("viewer"), "viewer")
  assert.equal(getAdminRole("user"), null)
  assert.equal(getAdminRole(undefined), null)
})

test("admin roles receive only their allowed permissions", () => {
  const adminRole = getAdminRole("admin")
  assert.ok(adminRole)
  const adminPermissions = getAdminPermissions(adminRole, [
    "view_games",
    "delete_games",
    "manage_admin_accounts",
    "unknown",
  ])
  assert.deepEqual(adminPermissions, ["view_games"])
  assert.equal(hasAdminPermission(adminRole, adminPermissions, "view_games"), true)
  assert.equal(hasAdminPermission(adminRole, adminPermissions, "delete_games"), false)
  assert.equal(hasAdminPermission(adminRole, adminPermissions, "manage_admin_accounts"), false)
  assert.equal(hasAdminPermission(adminRole, adminPermissions, "manage_sessions"), false)

  const superAdminRole = getAdminRole("super_admin")
  assert.ok(superAdminRole)
  const superAdminPermissions = getAdminPermissions(superAdminRole, [])
  assert.equal(hasAdminPermission(superAdminRole, superAdminPermissions, "manage_user_game_availability"), true)

  const viewerRole = getAdminRole("viewer")
  assert.ok(viewerRole)
  const viewerPermissions = getAdminPermissions(viewerRole, ["view_games", "view_audit_logs", "create_games"])
  assert.deepEqual(viewerPermissions, ["view_games", "view_audit_logs"])
  assert.equal(hasAdminPermission(viewerRole, viewerPermissions, "view_games"), true)
  assert.equal(hasAdminPermission(viewerRole, viewerPermissions, "view_audit_logs"), true)
  assert.equal(hasAdminPermission(viewerRole, viewerPermissions, "create_games"), false)
  assert.deepEqual(getDefaultAdminPermissions("viewer"), ["view_games", "view_audit_logs"])
})

test("account creation requires a valid role and a strong initial password", () => {
  const valid = {
    email: "reader@example.com",
    displayName: "Read Only",
    password: "A-long-temporary-password",
    role: "viewer",
  }
  assert.equal(CreateAdminAccountSchema.safeParse(valid).success, true)
  assert.equal(CreateAdminAccountSchema.safeParse({ ...valid, password: "short" }).success, false)
  assert.equal(CreateAdminAccountSchema.safeParse({ ...valid, role: "owner" }).success, false)
})

test("audit records allow only sanitized administrative metadata", () => {
  const event = {
    eventId: "-event-id",
    actorUid: "firebase-uid",
    actorDisplayName: "Operator",
    actorRole: "super_admin",
    permission: "edit_games",
    method: "PATCH",
    path: "/api/admin/platform/games/bingo",
    requestedAt: 1_800_000_000_000,
    completedAt: null,
    outcome: "REQUESTED",
    responseStatus: null,
  }
  assert.equal(PlatformAuditEventSchema.safeParse(event).success, true)
  assert.equal(
    PlatformAuditEventSchema.safeParse({ ...event, credentials: "must-not-be-recorded" }).success,
    false,
  )
})
