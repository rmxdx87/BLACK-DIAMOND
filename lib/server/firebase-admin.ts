import "server-only"

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getDatabase } from "firebase-admin/database"

const APP_NAME = "black-diamond-admin"

export class FirebaseAdminConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "FirebaseAdminConfigurationError"
  }
}

function getServiceAccount(): ServiceAccount | undefined {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
  if (!raw) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new FirebaseAdminConfigurationError(
      "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON must contain valid JSON.",
    )
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("project_id" in parsed) ||
    !("client_email" in parsed) ||
    !("private_key" in parsed) ||
    typeof parsed.project_id !== "string" ||
    typeof parsed.client_email !== "string" ||
    typeof parsed.private_key !== "string"
  ) {
    throw new FirebaseAdminConfigurationError(
      "The Firebase service account JSON is missing required fields.",
    )
  }

  return parsed as ServiceAccount
}

function getFirebaseAdminApp() {
  const existing = getApps().find((app) => app.name === APP_NAME)
  if (existing) return existing

  const serviceAccount = getServiceAccount()
  const serviceAccountProjectId = (
    serviceAccount as (ServiceAccount & { project_id?: string }) | undefined
  )?.project_id
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
    serviceAccount?.projectId ||
    serviceAccountProjectId ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim()
  const databaseURL = (
    process.env.FIREBASE_ADMIN_DATABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim() ||
    (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : "")
  ).replace(/\/+$/, "")

  if (!projectId) {
    throw new FirebaseAdminConfigurationError(
      "Firebase Admin requires a project ID. Set FIREBASE_ADMIN_PROJECT_ID or configure it in the service account.",
    )
  }

  const credential = serviceAccount ? cert(serviceAccount) : applicationDefault()

  try {
    return initializeApp({ credential, databaseURL, projectId }, APP_NAME)
  } catch (error) {
    if (error instanceof FirebaseAdminConfigurationError) throw error
    throw new FirebaseAdminConfigurationError(
      "Firebase Admin could not initialize. Configure a service account or Application Default Credentials.",
    )
  }
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp())
}

export function getFirebaseAdminDatabase() {
  return getDatabase(getFirebaseAdminApp())
}
