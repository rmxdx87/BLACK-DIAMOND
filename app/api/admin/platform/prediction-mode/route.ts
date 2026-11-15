import { NextResponse } from "next/server"
import { z } from "zod"
import { PlatformStoreError } from "@/lib/server/platform-store"
import { readPlatformJson, withPlatformAdmin } from "@/lib/server/platform-routes"
import { setPlatformPredictionMode } from "@/lib/server/platform-predictions"

export const runtime = "nodejs"

const PredictionModeSchema = z.object({
  gameId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sessionId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  mode: z.enum(["system", "manual"]),
}).strict()

export async function POST(request: Request) {
  return withPlatformAdmin(request, "switch_prediction_mode", async () => {
    const parsed = PredictionModeSchema.safeParse(await readPlatformJson(request))
    if (!parsed.success) throw new PlatformStoreError("Invalid prediction mode request.", 400)
    await setPlatformPredictionMode(parsed.data.gameId, parsed.data.mode, parsed.data.sessionId)
    return NextResponse.json({ ok: true, mode: parsed.data.mode })
  })
}
