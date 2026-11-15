import "server-only"

import { NextResponse } from "next/server"
import {
  AdminAuthorizationError,
  requireAdmin,
  type AdminPermission,
  type VerifiedAdmin,
} from "./admin-auth"
import { FirebaseAdminConfigurationError } from "./firebase-admin"
import { PlatformStoreError } from "./platform-store"
import { beginPlatformAuditEvent, finishPlatformAuditEvent, PlatformAuditError } from "./platform-audit"

export async function withPlatformAdmin(
  request: Request,
  permission: AdminPermission,
  action: (admin: VerifiedAdmin) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const admin = await requireAdmin(request, permission)
    const method = request.method.toUpperCase()
    const isMutation = method === "POST" || method === "PATCH" || method === "DELETE"
    const auditEventId = isMutation
      ? await beginPlatformAuditEvent(
          admin,
          permission,
          method,
          new URL(request.url).pathname,
        )
      : null

    let response: NextResponse
    try {
      response = await action(admin)
    } catch (error) {
      if (auditEventId) {
        try {
          await finishPlatformAuditEvent(auditEventId, "FAILED", null)
        } catch (auditError) {
          console.error("[Platform audit] Unable to record failed action:", auditError)
        }
      }
      throw error
    }

    if (auditEventId) {
      await finishPlatformAuditEvent(
        auditEventId,
        response.ok ? "COMPLETED" : "REJECTED",
        response.status,
      )
    }
    return response
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof FirebaseAdminConfigurationError) {
      return NextResponse.json(
        { error: "The server-side Firebase service is not configured." },
        { status: 503 },
      )
    }
    if (error instanceof PlatformStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof PlatformAuditError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("[Platform API] Request failed:", error)
    return NextResponse.json({ error: "The platform request could not be completed." }, { status: 500 })
  }
}

export async function readPlatformJson(request: Request): Promise<unknown> {
  const maxBytes = 100_000
  const contentLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new PlatformStoreError("Request body exceeds the allowed size.", 400)
  }

  const reader = request.body?.getReader()
  if (!reader) throw new PlatformStoreError("Request body must be valid JSON.", 400)

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > maxBytes) {
      await reader.cancel()
      throw new PlatformStoreError("Request body exceeds the allowed size.", 400)
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch {
    throw new PlatformStoreError("Request body must be valid JSON.", 400)
  }
}
