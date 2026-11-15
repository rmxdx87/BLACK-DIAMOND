import { NextResponse } from "next/server"
import { createPlatformGame, listPlatformGames } from "@/lib/server/platform-store"
import { readPlatformJson, withPlatformAdmin } from "@/lib/server/platform-routes"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withPlatformAdmin(request, "view_games", async () =>
    NextResponse.json({ games: await listPlatformGames() }),
  )
}

export async function POST(request: Request) {
  return withPlatformAdmin(request, "create_games", async () => {
    const game = await createPlatformGame(await readPlatformJson(request))
    return NextResponse.json({ game }, { status: 201 })
  })
}
