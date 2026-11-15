import { NextResponse } from "next/server"

const UPSTREAM_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const upstreamUrl = new URL(UPSTREAM_URL)
  for (const key of ["pageNo", "pageSize"]) {
    const value = requestUrl.searchParams.get(key)
    if (value) upstreamUrl.searchParams.set(key, value)
  }

  try {
    const response = await fetch(upstreamUrl, {
      headers: { Accept: "application/json, text/plain, */*" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
    const body = await response.text()
    return new NextResponse(body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    })
  } catch (error) {
    return NextResponse.json(
      { code: -1, msg: error instanceof Error ? error.message : "Unable to reach the WinGo source" },
      { status: 502 },
    )
  }
}
