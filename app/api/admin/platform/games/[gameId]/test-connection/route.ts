import { NextResponse } from "next/server"
import { z } from "zod"
import { PlatformStoreError, testPlatformApi } from "@/lib/server/platform-store"
import { readPlatformJson, withPlatformAdmin } from "@/lib/server/platform-routes"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ gameId: string }>
}

const TestConnectionSchema = z.object({
  sessionId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
}).strict()

export async function POST(request: Request, context: RouteContext) {
  return withPlatformAdmin(request, "manage_api_configs", async () => {
    const body = await readPlatformJson(request)
    const parsedBody = TestConnectionSchema.safeParse(body)
    if (!parsedBody.success) {
      throw new PlatformStoreError("Invalid API test request.", 400)
    }

    const { gameId } = await context.params
    const result = await testPlatformApi(gameId, parsedBody.data.sessionId)
    return NextResponse.json({ test: result })
  })
}
