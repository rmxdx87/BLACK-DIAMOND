import { NextResponse } from "next/server"
import { deletePlatformSession, updatePlatformSession } from "@/lib/server/platform-store"
import { readPlatformJson, withPlatformAdmin } from "@/lib/server/platform-routes"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ gameId: string; sessionId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  return withPlatformAdmin(request, "manage_sessions", async () => {
    const { gameId, sessionId } = await context.params
    const session = await updatePlatformSession(gameId, sessionId, await readPlatformJson(request))
    return NextResponse.json({ session })
  })
}

export async function DELETE(request: Request, context: RouteContext) {
  return withPlatformAdmin(request, "manage_sessions", async () => {
    const { gameId, sessionId } = await context.params
    await deletePlatformSession(gameId, sessionId)
    return NextResponse.json({ ok: true })
  })
}
