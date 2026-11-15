import { NextResponse } from "next/server"
import { getAdminRole, getDefaultAdminPermissions } from "@/lib/platform/admin-permissions"
import { CreateAdminAccountSchema } from "@/lib/platform/admin-account-schema"
import { getFirebaseAdminAuth } from "@/lib/server/firebase-admin"
import { readPlatformJson, withPlatformAdmin } from "@/lib/server/platform-routes"

export const runtime = "nodejs"

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null
  return typeof error.code === "string" ? error.code : null
}

export async function GET(request: Request) {
  return withPlatformAdmin(request, "manage_admin_accounts", async () => {
    const searchParams = new URL(request.url).searchParams
    const pageToken = searchParams.get("pageToken") ?? undefined
    if (pageToken && pageToken.length > 2048) {
      return NextResponse.json({ error: "The page token is invalid." }, { status: 400 })
    }

    const result = await getFirebaseAdminAuth().listUsers(100, pageToken)
    const accounts = result.users.flatMap((user) => {
      const role = getAdminRole(user.customClaims?.role)
      if (!role) return []
      return [{
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? "",
        role,
        disabled: user.disabled,
      }]
    })

    return NextResponse.json(
      { accounts, nextPageToken: result.pageToken ?? null },
      { headers: { "Cache-Control": "no-store" } },
    )
  })
}

export async function POST(request: Request) {
  return withPlatformAdmin(request, "manage_admin_accounts", async () => {
    const body = await readPlatformJson(request)
    const parsed = CreateAdminAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Provide a valid email, display name, password of at least 12 characters, and role." },
        { status: 400 },
      )
    }

    const auth = getFirebaseAdminAuth()
    let account
    try {
      account = await auth.createUser({
        email: parsed.data.email,
        displayName: parsed.data.displayName,
        password: parsed.data.password,
      })
    } catch (error) {
      const code = getErrorCode(error)
      if (code === "auth/email-already-exists") {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })
      }
      if (code === "auth/invalid-email" || code === "auth/invalid-password") {
        return NextResponse.json({ error: "The email or password does not meet Firebase requirements." }, { status: 400 })
      }
      throw error
    }

    try {
      await auth.setCustomUserClaims(account.uid, {
        role: parsed.data.role,
        platformPermissions: getDefaultAdminPermissions(parsed.data.role),
      })
    } catch (error) {
      try {
        await auth.deleteUser(account.uid)
      } catch (cleanupError) {
        console.error("[Admin accounts] Unable to remove an account after role provisioning failed:", cleanupError)
      }
      throw error
    }

    return NextResponse.json(
      {
        account: {
          uid: account.uid,
          email: account.email ?? "",
          displayName: account.displayName ?? "",
          role: parsed.data.role,
          disabled: account.disabled,
        },
      },
      { status: 201 },
    )
  })
}
