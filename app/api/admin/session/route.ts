import { NextResponse } from "next/server"
import {
  AdminAuthorizationError,
  requireAdmin,
} from "@/lib/server/admin-auth"
import { FirebaseAdminConfigurationError } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request)
    return NextResponse.json({
      session: {
        user: {
          id: admin.uid,
          username: admin.displayName,
          email: admin.email,
          role: admin.role,
        },
      },
    })
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof FirebaseAdminConfigurationError) {
      return NextResponse.json(
        { error: "Admin authentication is not configured on the server." },
        { status: 503 },
      )
    }
    console.error("[Admin session] Verification failed:", error)
    return NextResponse.json(
      { error: "Admin authentication is temporarily unavailable." },
      { status: 500 },
    )
  }
}
