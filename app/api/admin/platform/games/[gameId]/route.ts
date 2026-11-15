import { NextResponse } from "next/server"
import { deletePlatformGame, updatePlatformGame } from "@/lib/server/platform-store"
import { readPlatformJson, withPlatformAdmin } from "@/lib/server/platform-routes"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ gameId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  return withPlatformAdmin(request, "edit_games", async () => {
    const { gameId } = await context.params
    const game = await updatePlatformGame(gameId, await readPlatformJson(request))
    return NextResponse.json({ game })
  })
}

export async function DELETE(request: Request, context: RouteContext) {
  return withPlatformAdmin(request, "delete_games", async () => {
    const { gameId } = await context.params
    await deletePlatformGame(gameId)
    return NextResponse.json({ ok: true })
  })
}
