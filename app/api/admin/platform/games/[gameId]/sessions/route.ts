import { NextResponse } from "next/server"
import { createPlatformSession, listPlatformSessions } from "@/lib/server/platform-store"
import { readPlatformJson, withPlatformAdmin } from "@/lib/server/platform-routes"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ gameId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  return withPlatformAdmin(request, "view_games", async () => {
    const { gameId } = await context.params
    return NextResponse.json({ sessions: await listPlatformSessions(gameId) })
  })
}

export async function POST(request: Request, context: RouteContext) {
  return withPlatformAdmin(request, "manage_sessions", async () => {
    const { gameId } = await context.params
    const session = await createPlatformSession(gameId, await readPlatformJson(request))
    return NextResponse.json({ session }, { status: 201 })
  })
}
