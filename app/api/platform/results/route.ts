import { NextResponse } from "next/server"
import { GameApiError } from "@/lib/platform/json-api-adapter"
import { FirebaseAdminConfigurationError } from "@/lib/server/firebase-admin"
import { verifyPlatformPrediction } from "@/lib/server/platform-predictions"
import { fetchPublishedPlatformResult, PlatformStoreError } from "@/lib/server/platform-store"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const gameId = url.searchParams.get("gameId") ?? ""
  const sessionId = url.searchParams.get("sessionId") ?? ""

  try {
    const result = await fetchPublishedPlatformResult(gameId, sessionId)
    const settledPrediction = await verifyPlatformPrediction(gameId, sessionId, result)
    return NextResponse.json(
      { ...result, settledPrediction },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    if (error instanceof PlatformStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof GameApiError) {
      return NextResponse.json(
        { error: error.message, category: error.category, httpStatus: error.statusCode ?? null },
        { status: 502 },
      )
    }
    if (error instanceof FirebaseAdminConfigurationError) {
      return NextResponse.json({ error: "The result service is not configured on the server." }, { status: 503 })
    }
    console.error("[Platform results] Fetch failed:", error)
    return NextResponse.json({ error: "Unable to fetch this game's latest result." }, { status: 500 })
  }
}
