import { NextResponse } from "next/server"
import { listPlatformAuditEvents } from "@/lib/server/platform-audit"
import { withPlatformAdmin } from "@/lib/server/platform-routes"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withPlatformAdmin(request, "view_audit_logs", async () => {
    const rawLimit = new URL(request.url).searchParams.get("limit")
    const limit = rawLimit === null ? 50 : Number(rawLimit)
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Limit must be an integer from 1 to 100." }, { status: 400 })
    }
    return NextResponse.json(
      { events: await listPlatformAuditEvents(limit) },
      { headers: { "Cache-Control": "no-store" } },
    )
  })
}
