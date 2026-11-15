"use client"

import { auth } from "@/lib/firebase"

export async function adminApiFetch<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const firebaseUser = auth?.currentUser
  if (!firebaseUser) throw new Error("Sign in with an administrator account to continue.")

  const token = await firebaseUser.getIdToken()
  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${token}`)
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(input, { ...init, headers, cache: "no-store" })
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error("The platform API returned an invalid response.")
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "The platform request failed."
    throw new Error(message)
  }

  return payload as T
}
