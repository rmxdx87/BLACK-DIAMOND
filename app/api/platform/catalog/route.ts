import { NextResponse } from "next/server"
import { getPublicPlatformCatalog } from "@/lib/server/platform-store"
import { FirebaseAdminConfigurationError } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

export async function GET() {
  try {
    const games = await getPublicPlatformCatalog()
    return NextResponse.json(
      { games, syncedAt: Date.now() },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    if (error instanceof FirebaseAdminConfigurationError) {
      return NextResponse.json(
        { error: "The game catalog is not configured on the server." },
        { status: 503 },
      )
    }
    console.error("[Platform catalog] Read failed:", error)
    return NextResponse.json({ error: "Unable to load the game catalog." }, { status: 500 })
  }
}
