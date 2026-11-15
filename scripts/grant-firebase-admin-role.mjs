import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

const [uid, role] = process.argv.slice(2)
const allowedRoles = new Set(["admin", "super_admin", "viewer"])

if (!uid || !allowedRoles.has(role)) {
  console.error("Usage: node scripts/grant-firebase-admin-role.mjs <firebase-uid> <admin|super_admin|viewer>")
  process.exitCode = 1
} else {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const databaseURL =
    process.env.FIREBASE_ADMIN_DATABASE_URL ??
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL

  if (!projectId) {
    console.error("Set FIREBASE_ADMIN_PROJECT_ID before provisioning an administrator.")
    process.exitCode = 1
  } else {
    let credential
    const rawServiceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON

    try {
      credential = rawServiceAccount
        ? cert(JSON.parse(rawServiceAccount))
        : applicationDefault()
    } catch (error) {
      console.error("Could not load Firebase Admin credentials:", error)
      process.exitCode = 1
    }

    if (credential) {
      const app =
        getApps().find((candidate) => candidate.name === "admin-role-provisioner") ??
        initializeApp(
          { credential, projectId, databaseURL },
          "admin-role-provisioner",
        )
      const auth = getAuth(app)

      try {
        const user = await auth.getUser(uid)
        const platformPermissions =
          role === "super_admin"
            ? [
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
            : role === "admin"
              ? [
                "view_games",
                "create_games",
                "edit_games",
                "manage_sessions",
                "manage_api_configs",
                "publish_predictions",
                "switch_prediction_mode",
              ]
              : ["view_games", "view_audit_logs"]

        await auth.setCustomUserClaims(uid, {
          ...user.customClaims,
          role,
          platformPermissions,
        })

        console.log(`Granted ${role} access to Firebase UID ${uid}.`)
        console.log("The account must sign in again to receive updated claims.")
      } catch (error) {
        console.error("Failed to grant Firebase administrator claims:", error)
        process.exitCode = 1
      }
    }
  }
}
