import { NextResponse } from "next/server"
import { FirebaseAdminConfigurationError } from "@/lib/server/firebase-admin"
import {
  getPublicPlatformPrediction,
  PlatformPredictionError,
} from "@/lib/server/platform-predictions"
import { PlatformStoreError } from "@/lib/server/platform-store"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const gameId = url.searchParams.get("gameId") ?? ""
  const sessionId = url.searchParams.get("sessionId") ?? ""
  const targetPeriodId = url.searchParams.get("targetPeriodId") ?? undefined
  if (targetPeriodId && !/^[A-Za-z0-9_-]{1,160}$/.test(targetPeriodId)) {
    return NextResponse.json({ error: "Invalid target period ID." }, { status: 400 })
  }

  try {
    const prediction = await getPublicPlatformPrediction(gameId, sessionId, targetPeriodId)
    return NextResponse.json(prediction, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof PlatformStoreError || error instanceof PlatformPredictionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof FirebaseAdminConfigurationError) {
      return NextResponse.json({ error: "The prediction service is not configured on the server." }, { status: 503 })
    }
    console.error("[Platform prediction] Read failed:", error)
    return NextResponse.json({ error: "Unable to load this prediction." }, { status: 500 })
  }
}
