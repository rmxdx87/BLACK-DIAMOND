import { NextResponse } from "next/server"
import { PlatformPredictionError, listPlatformPredictions, publishManualPlatformPrediction } from "@/lib/server/platform-predictions"
import { PlatformStoreError } from "@/lib/server/platform-store"
import { readPlatformJson, withPlatformAdmin } from "@/lib/server/platform-routes"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withPlatformAdmin(request, "view_games", async () => {
    const url = new URL(request.url)
    const gameId = url.searchParams.get("gameId") ?? ""
    const sessionId = url.searchParams.get("sessionId") ?? ""
    try {
      return NextResponse.json({
        predictions: await listPlatformPredictions(gameId, sessionId),
      })
    } catch (error) {
      if (error instanceof PlatformPredictionError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }
  })
}

export async function POST(request: Request) {
  return withPlatformAdmin(request, "publish_predictions", async (admin) => {
    try {
      const prediction = await publishManualPlatformPrediction(await readPlatformJson(request), admin)
      return NextResponse.json({ prediction }, { status: 201 })
    } catch (error) {
      if (error instanceof PlatformPredictionError || error instanceof PlatformStoreError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }
  })
}
